import test from "node:test";
import assert from "node:assert/strict";
import { playDeterministicGame, scorePlayerMarks } from "../../app/model.ts";
import { scenarioPlayers } from "./helpers.ts";

export default {
  id: "roll-and-write-scorecard.complete",
  description:
    "Terminal scorecard state carries reducer-owned scoring evidence.",
};

test("deterministic eight-round game completes with score components", () => {
  const state = playDeterministicGame(scenarioPlayers);
  assert.equal(state.completed, true);
  assert.equal(state.round, 8);
  assert.ok(state.scores?.["player-1"]?.total);
  assert.deepEqual(Object.keys(state.scores!["player-1"]!.components), [
    "completeRows",
    "completeColumns",
    "largestRegion",
    "failedSurveys",
  ]);
  assert.equal(state.outcome?.reason.code, "SURVEY_COMPLETE");
});

test("failed survey penalty contributes negative points", () => {
  assert.deepEqual(
    scorePlayerMarks({
      "cell-0-0": { kind: "failed", round: 1 },
    }),
    {
      total: -2,
      components: {
        completeRows: 0,
        completeColumns: 0,
        largestRegion: 0,
        failedSurveys: 1,
      },
    },
  );
});
