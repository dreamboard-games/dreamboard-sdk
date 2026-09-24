import { expect, it } from "vitest";
import hearts from "../../../../examples/reference-games/hearts/app/game.ts";
import hex from "../../../../examples/reference-games/hex-network-trading/app/game.ts";
import completeHearts from "../../../../examples/reference-games/hearts/test/scenarios/complete-game.scenario.ts";
import bandits from "../../../../examples/reference-games/hex-network-trading/test/scenarios/bandits.scenario.ts";
import { localSource } from "../testing/sources/local-source.js";
import { scenarioSource } from "../testing/sources/scenario-source.js";
import { createGameInstance } from "./instance.js";

it("captures private Hearts cards and follows a complete game through the source capability", async () => {
  const source = await localSource(hearts, {
    players: 4,
    seed: 1,
    as: "player-1",
  });
  const game = createGameInstance<typeof hearts>()({ source, debug: false });
  const original = game.inspect();
  const visible = original.zones
    .getAll()
    .flatMap((zone) => zone.getCards())
    .filter((card) => !card.hidden);
  expect(visible.length).toBeGreaterThan(0);
  expect(visible.every((card) => card.view !== null)).toBe(true);
  for (const command of [...completeHearts.given, ...completeHearts.when]) {
    expect(await game.apply(command)).toEqual({ accepted: true });
  }
  expect(game.phase.is("gameOver")).toBe(true);
  expect(game.me?.id).toBe("player-1");
  expect(original.phase.is("passing")).toBe(true);
  expect(
    original.zones
      .getAll()
      .flatMap((zone) => zone.getCards())
      .filter((card) => !card.hidden),
  ).toEqual(visible);
  game.dispose();
});

it("uses real Hex committed steps, restore, cancel and explicit null intent", async () => {
  const source = await scenarioSource(hex, bandits, {
    at: "ready-to-move",
    as: "player-1",
  });
  const game = createGameInstance<typeof hex>()({ source, debug: false });
  const key = "moveBandits.moveBandits" as const;
  const first = game.interactions.get(key)!;
  expect(first.getInputs().map((input) => input.key)).toEqual(["hexId"]);
  first.getInput("hexId")!.setValue("northForest");
  expect(await game.interactions.get(key)!.submit()).toEqual({
    accepted: true,
  });
  const saved = source.checkpoint();
  expect(
    game.interactions
      .get(key)!
      .getInputs()
      .map((input) => input.key),
  ).toEqual(["targetPlayerId"]);
  expect(game.interactions.get(key)!.getStep()?.selected).toEqual({
    hexId: "northForest",
  });
  expect(game.state.drafts[key]).toBeUndefined();
  expect(await game.interactions.get(key)!.cancel()).toEqual({
    accepted: true,
  });
  expect(game.interactions.get(key)!.getStepIndex()).toBe(0);
  source.restore(saved);
  expect(game.interactions.get(key)!.getStepIndex()).toBe(1);
  expect(await game.interactions.get(key)!.cancel()).toEqual({
    accepted: true,
  });
  game.interactions.get(key)!.getInput("hexId")!.setValue("southWestClay");
  expect(await game.interactions.get(key)!.submit()).toEqual({
    accepted: true,
  });
  expect(game.phase.is("moveBandits")).toBe(true);
  expect(game.state.drafts[key]).toBeUndefined();
  game.interactions.get(key)!.getInput("targetPlayerId")!.setValue(null);
  expect(await game.interactions.get(key)!.submit()).toEqual({
    accepted: true,
  });
  expect(game.phase.is("main")).toBe(true);
  game.dispose();
});
