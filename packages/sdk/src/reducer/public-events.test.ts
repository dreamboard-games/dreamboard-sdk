import { expect, test } from "vitest";
import { z } from "zod";
import { materializePluginGameplayFrame } from "../plugin-runtime-contract";
import { createGame, createReducerBundle } from "../reducer";
import { buildMinimalManifest, createTable } from "./lifecycle-test-fixtures";
const event = (title: string) => ({
  kind: "systemAction" as const,
  procedureId: "test",
  title,
});
async function fixture() {
  const model = createGame({
    manifest: buildMinimalManifest(["start", "play"] as const),
    phases: { start: z.object({}), play: z.object({}) },
    state: {
      public: z.object({}),
      private: z.object({ secret: z.string() }),
      hidden: z.object({ secret: z.string() }),
    },
  });
  const play = model.phase("play");
  const choice = () =>
    play.inputs.form.choice({
      choices: [{ value: "yes", label: "Yes" }],
      defaultValue: () => undefined,
    });
  const definition = model.assemble({
    initial: {
      public: () => ({}),
      private: () => ({ secret: "private-card" }),
      hidden: () => ({ secret: "hidden-card" }),
    },
    initialPhase: "start",
    phases: {
      start: model.phase("start").define({
        kind: "auto",
        initialState: () => ({}),
        enter({ tx }) {
          tx.emit(event("Started"));
          return tx.transition("play");
        },
      }),
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        enter({ tx }) {
          tx.setActivePlayers(["player-1"]);
          tx.emit(event("Entered"));
        },
        interactions: {
          publish: play.interaction({
            inputs: {},
            reduce({ tx }) {
              tx.emit(event("Published"));
            },
          }),
          otherPublish: play.interaction({
            actor: () => "player-2",
            inputs: {},
            reduce({ tx }) {
              tx.emit(event("Other player published"));
            },
          }),
          overflow: play.interaction({
            inputs: {},
            reduce({ tx }) {
              for (let index = 0; index < 31; index += 1)
                tx.emit(event("Batch"));
              return tx.transition("start");
            },
          }),
          restart: play.interaction({
            inputs: {},
            reduce({ tx }) {
              tx.emit(event("Restarted"));
              return tx.transition("start");
            },
          }),
          quiet: play.interaction({ inputs: {}, reduce() {} }),
          reject: play.interaction({
            inputs: {},
            reduce({ tx }) {
              tx.emit(event("Rejected secret must not escape"));
              return tx.reject("NO");
            },
          }),
          choose: play.interaction({
            steps: play
              .steps()
              .input("first", choice())
              .input("second", choice()),
            reduce({ tx }) {
              tx.emit(event("Finished"));
            },
          }),
        },
      }),
    },
    view: model.view(() => ({})),
  });
  const bundle = createReducerBundle(definition);
  const table = createTable();
  table.hands = {
    hand: { "player-1": [], "player-2": [] },
  };
  table.handVisibility = { hand: "ownerOnly" };
  const initial = await bundle.initialize({
    table,
    playerIds: ["player-1", "player-2"],
    rngSeed: 3,
  });
  return { bundle, initial };
}
test("public batches replace on every accepted operation and survive JSON checkpoint restore", async () => {
  const { bundle, initial } = await fixture();
  let state = initial.state;
  expect(state.runtime.events).toEqual([event("Started"), event("Entered")]);
  expect(initial.events).toEqual(state.runtime.events);
  const dispatch = async (
    interactionId: string,
    params: Record<string, string> = {},
  ) => {
    const result = await bundle.dispatch({
      state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId,
        params,
      },
    });
    if (result.kind !== "accept") throw new Error("Expected accepted command");
    state = result.state;
    expect(state.runtime.events).toEqual(result.events);
  };
  await dispatch("restart");
  expect(state.runtime.events).toEqual([
    event("Restarted"),
    event("Started"),
    event("Entered"),
  ]);
  await dispatch("publish");
  const checkpoint = JSON.stringify(state);
  const rejected = await bundle.dispatch({
    state,
    input: {
      kind: "interaction",
      playerId: "player-1",
      interactionId: "reject",
      params: {},
    },
  });
  expect(rejected.kind).toBe("reject");
  expect(JSON.stringify(state)).toBe(checkpoint);
  await dispatch("quiet");
  expect(state.runtime.events).toEqual([]);
  state = JSON.parse(checkpoint);
  const projection = bundle.project({ state, playerIds: ["player-1"] });
  const frame = materializePluginGameplayFrame({
    dynamicProjection: projection,
    currentPhase: "play",
    activePlayers: ["player-1"],
    perspectivePlayerId: "player-1",
    version: 10,
    actionSetVersion: "restored",
  });
  expect(frame.events).toEqual([event("Published")]);
  expect(JSON.stringify(frame)).not.toMatch(
    /private-card|hidden-card|Rejected secret/,
  );
  await dispatch("choose", { first: "yes" });
  expect(state.runtime.events).toEqual([]);
  const other = await bundle.dispatch({
    state,
    input: {
      kind: "interaction",
      playerId: "player-2",
      interactionId: "otherPublish",
      params: {},
    },
  });
  expect(other.kind).toBe("accept");
  if (other.kind !== "accept")
    throw new Error("Expected other player acceptance");
  expect(other.state.runtime.pending["player-1"]).toEqual(
    state.runtime.pending["player-1"],
  );
  expect(other.state.runtime.events).toEqual([event("Other player published")]);
  state = other.state;
  const cancelled = await bundle.dispatch({
    state,
    input: {
      kind: "interaction.cancel",
      playerId: "player-1",
      interactionId: "choose",
    },
  });
  expect(cancelled.kind).toBe("accept");
  if (cancelled.kind !== "accept") return;
  expect(cancelled.state.runtime.events).toEqual([]);
  state = cancelled.state;
  await dispatch("choose", { first: "yes" });
  await dispatch("choose", { second: "yes" });
  expect(state.runtime.events).toEqual([event("Finished")]);
});

test("the canonical event limit applies to the full operation and restored batches", async () => {
  const { bundle, initial } = await fixture();
  const before = JSON.stringify(initial.state);
  await expect(
    bundle.dispatch({
      state: initial.state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "overflow",
        params: {},
      },
    }),
  ).rejects.toThrow();
  expect(JSON.stringify(initial.state)).toBe(before);
  const oversized = structuredClone(initial.state);
  oversized.runtime.events = Array.from({ length: 33 }, () => event("Invalid"));
  expect(() =>
    bundle.project({ state: oversized, playerIds: ["player-1"] }),
  ).toThrow();
});
