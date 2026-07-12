import assert from "node:assert/strict";
import test from "node:test";
import dealtHand from "./dealt-hand.desktop.scenario.ts";
import finalOutcome from "./final-outcome.mobile.scenario.ts";
import firstTrick from "./first-trick.desktop.scenario.ts";
import midHand from "./mid-hand.desktop.scenario.ts";
import sealedPass from "./sealed-pass.mobile.scenario.ts";

test("UI evidence maps five structural checkpoints to the canonical legal replay path", () => {
  for (const scenario of [
    dealtHand,
    sealedPass,
    firstTrick,
    midHand,
    finalOutcome,
  ]) {
    assert.equal(
      scenario.behaviorScenario,
      "../scenarios/complete-game.scenario.ts",
    );
  }
  assert.deepEqual(dealtHand.at, { segment: "setup", completed: 0 });
  assert.deepEqual(sealedPass.at, { segment: "given", completed: 2 });
  assert.deepEqual(firstTrick.at, { segment: "given", completed: 8 });
  assert.deepEqual(midHand.at, { segment: "given", completed: 32 });
  assert.deepEqual(finalOutcome.at, { segment: "when", completed: 1 });
  assert.equal(dealtHand.replay[0]?.interactionId, "submit");
  assert.deepEqual(finalOutcome.environment.input, ["touch", "keyboard"]);
});
