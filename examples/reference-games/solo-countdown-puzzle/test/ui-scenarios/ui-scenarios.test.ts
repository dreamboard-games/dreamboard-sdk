import assert from "node:assert/strict";
import test from "node:test";
import developing from "./developing.mobile.scenario.ts";
import initial from "./initial.desktop.scenario.ts";
import reinforcementHit from "./reinforcement-hit.desktop.scenario.ts";
import terminal from "./terminal.mobile.scenario.ts";

test("UI checkpoints derive opening, developing, reinforcement, and terminal states from legal scenarios", () => {
  assert.deepEqual(
    [initial, developing, reinforcementHit, terminal].map(
      ({ behaviorScenario }) => behaviorScenario,
    ),
    [
      "../scenarios/weather-procedure-calm.scenario.ts",
      "../scenarios/complete-game-loss-storm.scenario.ts",
      "../scenarios/weather-procedure-north-squall-reinforced.scenario.ts",
      "../scenarios/complete-game.scenario.ts",
    ],
  );
  assert.deepEqual(developing.environment.viewport, "phone");
  assert.deepEqual(developing.environment.input, ["touch", "keyboard"]);
  assert.equal(reinforcementHit.replay[0]?.interactionId, "reinforce");
  assert.equal(terminal.replay[0]?.spaceId, "beacon-south");
});
