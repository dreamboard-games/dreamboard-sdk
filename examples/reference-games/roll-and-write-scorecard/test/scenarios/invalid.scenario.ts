import test from "node:test";
import assert from "node:assert/strict";
import { submitSurveyMark } from "../../app/model.ts";
import { rolledState } from "./helpers.ts";

export default {
  id: "roll-and-write-scorecard.invalid",
  description: "Illegal and stale scorecard submissions are rejected.",
};

test("invalid and stale submissions return reducer-owned error codes", () => {
  const state = rolledState();
  const invalid = submitSurveyMark(state, {
    playerId: "player-1",
    cellId: "cell-1-0",
  });
  assert.equal(invalid.accepted, false);
  assert.equal(
    (invalid.validation as { errorCode: string }).errorCode,
    "CELL_DOES_NOT_MATCH_ROLL",
  );

  const stale = submitSurveyMark(state, {
    playerId: "player-1",
    cellId: "cell-0-1",
    expectedRound: 0,
  });
  assert.equal(stale.accepted, false);
  assert.equal(
    (stale.validation as { errorCode: string }).errorCode,
    "STALE_SUBMISSION",
  );

  const wrongSeat = submitSurveyMark(state, {
    playerId: "player-2",
    cellId: "cell-0-1",
  });
  assert.equal(wrongSeat.accepted, false);
  assert.equal(
    (wrongSeat.validation as { errorCode: string }).errorCode,
    "PLAYER_NOT_ACTIVE",
  );
});
