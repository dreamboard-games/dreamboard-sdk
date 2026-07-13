import assert from "node:assert/strict";
import test from "node:test";
import acquired from "./acquired-card-recycle.mobile.scenario.ts";
import depleted from "./depleted-supply.desktop.scenario.ts";
import firstPurchase from "./first-purchase.desktop.scenario.ts";
import opening from "./opening-hand.desktop.scenario.ts";
import technique from "./technique-chain.desktop.scenario.ts";
import terminal from "./terminal-outcome.mobile.scenario.ts";

test("six Sketchbook UI checkpoints derive from the canonical legal replay", () => {
  const scenarios = [
    opening,
    firstPurchase,
    acquired,
    technique,
    depleted,
    terminal,
  ];
  assert.equal(
    scenarios.every(
      ({ behaviorScenario }) =>
        behaviorScenario === "../scenarios/complete-game.scenario.ts",
    ),
    true,
  );
  assert.deepEqual(
    scenarios.map(({ at }) => at),
    [
      { segment: "setup", completed: 0 },
      { segment: "given", completed: 5 },
      { segment: "given", completed: 26 },
      { segment: "given", completed: 62 },
      { segment: "given", completed: 361 },
      { segment: "when", completed: 1 },
    ],
  );
  assert.equal(
    scenarios.every(({ replay }) => replay.length === 0),
    true,
  );
});
