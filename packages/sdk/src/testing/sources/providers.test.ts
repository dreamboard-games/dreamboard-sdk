import { describe, expect, it, vi } from "vitest";
import hearts from "../../../../../examples/reference-games/hearts/app/game.ts";
import hex from "../../../../../examples/reference-games/hex-network-trading/app/game.ts";
import completeHearts from "../../../../../examples/reference-games/hearts/test/scenarios/complete-game.scenario.ts";
import bandits from "../../../../../examples/reference-games/hex-network-trading/test/scenarios/bandits.scenario.ts";
import { providerGame } from "./__fixtures__/game.js";
import { localSource } from "./local-source.js";
import { scenarioSource } from "./scenario-source.js";
import { fuzz } from "./fuzz.js";
import { createTestSource } from "./test-source.js";
import type { SourceSnapshot } from "../../headless/sources/types.js";

const snapshot: SourceSnapshot = {
  me: "alice",
  players: [{ playerId: "alice", displayName: "Alice" }],
  version: 1,
  frame: {
    events: [],
    view: { score: 0 },
    flow: {
      currentPhase: "play",
      currentStage: null,
      activePlayers: ["alice"],
      simultaneousPhase: null,
    },
    availableInteractions: [],
    zones: {},
  },
};

describe("controlled test source", () => {
  it("keeps ACK/frame order explicit without exposing wire identities", async () => {
    const source = createTestSource(snapshot);
    const pending = source.submit("move", { target: "a" });
    expect(source.submissions[0]).toMatchObject({
      operation: "submit",
      interactionId: "move",
      params: { target: "a" },
    });
    expect(source.submissions[0]).not.toHaveProperty("basis");
    expect(source.submissions[0]).not.toHaveProperty("clientActionId");
    source.submissions[0].resolve({ accepted: true });
    expect(await pending).toEqual({ accepted: true });
    expect(source.store.get().request?.phase).toBe("awaiting-frame");
    source.emit({ ...snapshot, version: 2 });
    expect(source.store.get().request).toBeNull();
    const cancel = source.cancel("move");
    source.emit({ ...snapshot, version: 3 });
    expect(source.store.get().request?.phase).toBe("awaiting-result");
    source.submissions[1].resolve({ accepted: true });
    await cancel;
    expect(source.store.get().request).toBeNull();
    source.dispose();
  });
  it("rejects unresolved promises and ignores late test emissions after disposal", async () => {
    const source = createTestSource(snapshot);
    const pending = source.submit("move", {});
    source.dispose();
    await expect(pending).rejects.toThrow("disposed");
    const final = source.store.get();
    source.emit({ ...snapshot, version: 2 });
    expect(source.store.get()).toBe(final);
  });
});
describe("production-backed local sources", () => {
  it("rejects a valid checkpoint from a different session roster without changing the source", async () => {
    const source = await localSource(hex, { players: 3, seed: 2 });
    const other = await localSource(hex, { players: 3, seed: 2 });
    const differentRoster = other.checkpoint();
    (
      differentRoster.state.domain.table as { playerOrder: string[] }
    ).playerOrder.reverse();
    const before = source.checkpoint();
    const snapshot = source.inspect();
    expect(() => source.restore(differentRoster)).toThrow("roster");
    expect(source.checkpoint()).toEqual(before);
    expect(source.inspect()).toBe(snapshot);
    source.dispose();
    other.dispose();
  });

  it("preserves terminal initialization in local and scenario JSON restores without reinitializing", async () => {
    const initialize = vi.fn();
    const game = providerGame(initialize);
    const source = await localSource(game, {
      players: 2,
      seed: 1,
      options: { finishImmediately: true },
    });
    const saved = JSON.parse(JSON.stringify(source.checkpoint()));
    expect(saved.terminal.reason.code).toBe("complete");
    expect(initialize).toHaveBeenCalledTimes(1);
    source.restore(saved);
    source.restore(saved);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(source.checkpoint().terminal).toEqual(saved.terminal);
    source.dispose();
    const scenario = await scenarioSource(game, {
      id: "terminal",
      setup: { players: 2, seed: 1, options: { finishImmediately: true } },
      given: [],
      when: [],
      then() {},
    });
    expect(initialize).toHaveBeenCalledTimes(2);
    expect(scenario.checkpoint().terminal).toEqual(saved.terminal);
    scenario.restore(JSON.parse(JSON.stringify(scenario.checkpoint())));
    expect(initialize).toHaveBeenCalledTimes(2);
    scenario.dispose();
  });

  it("deterministically fuzzes a full Hearts game with a bounded solver budget", async () => {
    const result = await fuzz(hearts, {
      seed: 1,
      steps: 200,
      maxEvaluations: 5000,
    });
    expect(result.error).toBeUndefined();
    expect(result.checkpoint.terminal).not.toBeNull();
    expect(result.commands).toHaveLength(56);
    const replay = await localSource(hearts, { players: 4, seed: 1 });
    for (const command of result.commands)
      expect((await replay.apply(command)).accepted).toBe(true);
    expect(replay.checkpoint()).toEqual(result.checkpoint);
    replay.dispose();
  });

  it("plays complete Hearts through typed actor commands while retaining selected view", async () => {
    const source = await localSource(hearts, {
      players: 4,
      seed: 1,
      as: "player-1",
    });
    for (const command of [...completeHearts.given, ...completeHearts.when])
      expect(await source.apply(command)).toEqual({ accepted: true });
    expect(source.inspect().me).toBe("player-1");
    expect(source.inspect().frame.flow.currentPhase).toBe("gameOver");
    expect(source.checkpoint().terminal?.standings[0].playerId).toBe(
      "player-4",
    );
    const ended = JSON.parse(JSON.stringify(source.checkpoint()));
    const oldVersion = source.inspect().version;
    source.restore(ended);
    expect(source.inspect().version).toBeGreaterThan(oldVersion);
    expect(source.checkpoint().terminal).toEqual(ended.terminal);
    expect(await source.submit("playCard", { cardId: "clubs-2" })).toEqual({
      accepted: false,
      errorCode: "game-ended",
    });
    source.dispose();
  });
  it("switches selected-seat privacy and invalidates in-flight intent without replay", async () => {
    const source = await localSource(hearts, { players: 4, seed: 1 });
    const first = source.inspect();
    const pending = source.submit("submit", completeHearts.given[0].params);
    source.switchSeat("player-2");
    await expect(pending).rejects.toThrow("disposed");
    expect(source.inspect().me).toBe("player-2");
    expect(source.inspect().frame.view).not.toEqual(first.frame.view);
    expect(source.checkpoint().state.runtime.simultaneous.current).toEqual(
      null,
    );
    source.switchSeat("player-1");
    expect(source.inspect().frame.view).toEqual(first.frame.view);
    source.dispose();
  });
  it("restores a Hex committed prefix from JSON without replay, retains rejected final choice, and cancels authoritatively", async () => {
    const source = await scenarioSource(hex, bandits, {
      at: "ready-to-move",
      as: "player-1",
    });
    expect(
      await source.submit("moveBandits", { hexId: "northForest" }),
    ).toEqual({ accepted: true });
    const saved = JSON.parse(JSON.stringify(source.checkpoint()));
    const oldVersion = source.inspect().version;
    const step = source
      .inspect()
      .frame.availableInteractions.find(
        (item) => item.interactionId === "moveBandits",
      )!.step;
    expect(step?.selected).toEqual({ hexId: "northForest" });
    expect(
      (await source.submit("moveBandits", { targetPlayerId: "player-1" }))
        .accepted,
    ).toBe(false);
    expect(source.checkpoint()).toEqual(saved);
    expect(await source.cancel("moveBandits")).toEqual({ accepted: true });
    source.restore(saved);
    expect(source.inspect().version).toBeGreaterThan(oldVersion);
    expect(source.checkpoint()).toEqual(saved);
    expect(
      source
        .inspect()
        .frame.availableInteractions.find(
          (item) => item.interactionId === "moveBandits",
        )!.step?.selected,
    ).toEqual({ hexId: "northForest" });
    expect(await source.cancel("moveBandits")).toEqual({ accepted: true });
    expect(
      await source.submit("moveBandits", { hexId: "southWestClay" }),
    ).toEqual({ accepted: true });
    expect(
      await source.submit("moveBandits", { targetPlayerId: null }),
    ).toEqual({ accepted: true });
    expect(source.inspect().frame.flow.currentPhase).toBe("main");
    source.dispose();
  });
  it("exploration uses bounded authoritative probes without changing pending state or RNG", async () => {
    const source = await scenarioSource(hex, bandits, {
      at: "ready-to-move",
      as: "player-1",
    });
    await source.submit("moveBandits", { hexId: "northForest" });
    const before = source.checkpoint();
    const commands = await source.explore({ maxEvaluations: 100 });
    expect(commands.length).toBeGreaterThan(0);
    expect(source.checkpoint()).toEqual(before);
    for (const command of commands)
      expect(Object.keys(command.params)).toEqual(["targetPlayerId"]);
    expect(await source.apply(commands[0])).toEqual({ accepted: true });
    source.dispose();
  });
});
