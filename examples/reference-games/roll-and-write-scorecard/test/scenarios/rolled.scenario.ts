import test from "node:test";
import assert from "node:assert/strict";
import { legalSurveyTargets } from "../../app/model.ts";
import { rolledState } from "./helpers.ts";

export default {
  id: "roll-and-write-scorecard.dice",
  description: "Round 1 seeded roll highlights matching scorecard cells.",
};

test("round one roll exposes matching legal cells", () => {
  const state = rolledState();
  assert.equal(state.roll?.total, 5);
  assert.deepEqual(legalSurveyTargets(state, "player-1"), [
    "cell-0-1",
    "cell-3-2",
  ]);
});
