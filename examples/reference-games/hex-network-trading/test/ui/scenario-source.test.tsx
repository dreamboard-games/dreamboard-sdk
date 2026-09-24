import assert from "node:assert/strict";
import test from "node:test";
import { boardFeature, createGameInstance } from "@dreamboard-games/sdk";
import { scenarioSource } from "@dreamboard-games/sdk/testing";
import game from "../../app/game";
import bandits from "../scenarios/bandits.scenario";
import depot from "../scenarios/depot-trades.scenario";
import setup from "../scenarios/topology-and-setup.scenario";

function instance(
  source: Awaited<ReturnType<typeof scenarioSource<typeof game>>>,
) {
  return createGameInstance<typeof game>()({
    source,
    features: (core, context) => ({ board: boardFeature(core, context) }),
  });
}

test("live opening geometry commits one legal camp through its canonical handler", async () => {
  const source = await scenarioSource(game, setup, {
    at: "opening",
    as: "player-1",
  });
  const ui = instance(source);
  const vertex = ui.boards
    .get("frontier")!
    .getLayout({ hexSize: 30 })
    .getVertices()
    .find((value) => value.getIsSelectable())!;
  vertex.getSelectHandler()();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(ui.view!.currentPhase, "setupTrail");
  assert.equal(Object.values(ui.view!.campsByIntersectionId).length, 1);
  ui.dispose();
});

test("Supply Depot draft inputs stay independent and one submit exchanges atomically", async () => {
  const source = await scenarioSource(game, depot, {
    at: "depot-ready",
    as: "player-2",
  });
  const ui = instance(source);
  const before = structuredClone(ui.view!.mySupplies);
  ui.inputs
    .get("main.tradeWithSupplyDepot", "receiveResource")!
    .setValue("brick");
  assert.deepEqual(ui.view!.mySupplies, before);
  ui.inputs
    .get("main.tradeWithSupplyDepot", "giveResource")!
    .setValue("timber");
  assert.deepEqual(ui.view!.mySupplies, before);
  assert.equal(
    (await ui.interactions.get("main.tradeWithSupplyDepot")!.submit()).accepted,
    true,
  );
  assert.equal(ui.view!.mySupplies.timber, before.timber - 3);
  assert.equal(ui.view!.mySupplies.brick, before.brick + 1);
  assert.equal(ui.view!.currentPhase, "main");
  ui.dispose();
});

test("Bandits saved district survives restore, cancels, and accepts explicit no-victim without leaking seats", async () => {
  const source = await scenarioSource(game, bandits, {
    at: "ready-to-move",
    as: "player-1",
  });
  const ui = instance(source);
  ui.inputs.get("moveBandits.moveBandits", "hexId")!.setValue("northForest");
  assert.equal(
    (await ui.interactions.get("moveBandits.moveBandits")!.submit()).accepted,
    true,
  );
  assert.equal(ui.view!.banditsHexId, "centralBarrens");
  const saved = JSON.parse(JSON.stringify(source.checkpoint()));
  source.restore(saved);
  assert.deepEqual(
    ui.interactions.get("moveBandits.moveBandits")!.getStep()!.selected,
    { hexId: "northForest" },
  );
  source.switchSeat("player-3");
  assert.equal(ui.interactions.get("moveBandits.moveBandits"), undefined);
  assert.equal(ui.view!.myLastStolenResourceId, null);
  source.switchSeat("player-1");
  assert.equal(
    (await ui.interactions.get("moveBandits.moveBandits")!.cancel()).accepted,
    true,
  );
  assert.equal(
    ui.interactions.get("moveBandits.moveBandits")!.getStepIndex(),
    0,
  );
  ui.inputs.get("moveBandits.moveBandits", "hexId")!.setValue("southWestClay");
  await ui.interactions.get("moveBandits.moveBandits")!.submit();
  ui.inputs.get("moveBandits.moveBandits", "targetPlayerId")!.setValue(null);
  assert.equal(
    (await ui.interactions.get("moveBandits.moveBandits")!.submit()).accepted,
    true,
  );
  assert.equal(ui.view!.banditsHexId, "southWestClay");
  assert.equal(ui.view!.currentPhase, "main");
  ui.dispose();
});
