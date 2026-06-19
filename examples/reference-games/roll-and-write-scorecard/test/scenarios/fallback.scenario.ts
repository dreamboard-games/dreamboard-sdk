import test from "node:test";
import assert from "node:assert/strict";
import { legalSurveyTargets, submitSurveyMark } from "../../app/model.ts";
import { rolledState } from "./helpers.ts";

export default {
  id: "roll-and-write-scorecard.fallback",
  description:
    "A player with no matching total may mark any empty cell as failed.",
};

test("fallback mark is legal when no matching cells remain", () => {
  const state = rolledState();
  state.marks["player-1"] = {
    "cell-0-1": { kind: "surveyed", round: 1, rolledTotal: 5 },
    "cell-3-2": { kind: "surveyed", round: 1, rolledTotal: 5 },
  };
  assert.ok(legalSurveyTargets(state, "player-1").includes("cell-0-0"));
  const result = submitSurveyMark(state, {
    playerId: "player-1",
    cellId: "cell-0-0",
    expectedRound: 1,
  });
  assert.equal(result.accepted, true);
  assert.deepEqual(result.state.marks["player-1"]?.["cell-0-0"], {
    kind: "failed",
    round: 1,
  });
});
