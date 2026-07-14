import assert from "node:assert/strict";
import test from "node:test";
import dealtHand from "./dealt-hand.desktop.scenario.ts";
import finalOutcome from "./final-outcome.mobile.scenario.ts";
import firstTrick from "./first-trick.desktop.scenario.ts";
import midHand from "./mid-hand.desktop.scenario.ts";
import sealedPass from "./sealed-pass.mobile.scenario.ts";

test("UI evidence maps five named checkpoints to the canonical legal replay path", () => {
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
  assert.equal(dealtHand.at, "opening");
  assert.equal(sealedPass.at, "sealed-pass");
  assert.equal(firstTrick.at, "first-trick");
  assert.equal(midHand.at, "mid-hand");
  assert.equal(finalOutcome.at, "game-over");
  assert.equal(dealtHand.replay[0]?.interactionId, "submit");
});
