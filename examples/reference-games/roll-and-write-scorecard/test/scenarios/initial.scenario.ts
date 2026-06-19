import test from "node:test";
import assert from "node:assert/strict";
import { createInitialPublicState } from "../../app/model.ts";
import { scenarioPlayers } from "./helpers.ts";

export default {
  id: "roll-and-write-scorecard.initial",
  description: "Empty scorecards before the first automatic roll.",
};

test("initial scorecard state has no roll or marks", () => {
  const state = createInitialPublicState(scenarioPlayers);
  assert.equal(state.round, 1);
  assert.equal(state.roll, null);
  assert.equal(state.completed, false);
  assert.deepEqual(state.marks["player-1"], {});
  assert.deepEqual(state.marks["player-2"], {});
});
