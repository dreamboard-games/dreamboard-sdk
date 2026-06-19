import test from "node:test";
import assert from "node:assert/strict";
import { submitSurveyMark } from "../../app/model.ts";
import { rolledState } from "./helpers.ts";

export default {
  id: "roll-and-write-scorecard.submitted",
  description: "Accepted survey mark advances seat-order resolution.",
};

test("submitted mark records surveyed cell and advances active player", () => {
  const result = submitSurveyMark(rolledState(), {
    playerId: "player-1",
    cellId: "cell-0-1",
    expectedRound: 1,
  });
  assert.equal(result.accepted, true);
  assert.deepEqual(result.state.marks["player-1"]?.["cell-0-1"], {
    kind: "surveyed",
    round: 1,
    rolledTotal: 5,
  });
  assert.equal(result.state.activePlayerIndex, 1);
  assert.equal(
    result.state.playerIds[result.state.activePlayerIndex],
    "player-2",
  );
});
