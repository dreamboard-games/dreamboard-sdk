import assert from "node:assert/strict";
import test from "node:test";
import discard from "./discard-barrier.mobile.scenario.ts";
import growing from "./growing-network.desktop.scenario.ts";
import pendingTrade from "./pending-trade.mobile.scenario.ts";
import production from "./production.desktop.scenario.ts";
import setup from "./setup.desktop.scenario.ts";
import terminal from "./terminal.mobile.scenario.ts";

test("Stormtrail UI checkpoints all derive from ordinary legal behavior scenarios", () => {
  const scenarios = [
    setup,
    production,
    discard,
    pendingTrade,
    growing,
    terminal,
  ];
  assert.deepEqual(
    scenarios.map(({ behaviorScenario }) => behaviorScenario),
    [
      "../scenarios/topology-and-setup.scenario.ts",
      "../scenarios/production.scenario.ts",
      "../scenarios/discard-barrier.scenario.ts",
      "../scenarios/bilateral-trade.scenario.ts",
      "../scenarios/complete-game.scenario.ts",
      "../scenarios/complete-game.scenario.ts",
    ],
  );
  assert.deepEqual(
    scenarios.map(({ replay }) => replay),
    [[], [], [], [], [], []],
  );
  assert.equal(discard.viewer.playerId, "player-2");
  assert.equal(pendingTrade.viewer.playerId, "player-1");
  assert.equal(terminal.at.segment, "when");
});
