import assert from "node:assert/strict";
import {
  legalSurveyTargets,
  referenceGame,
  scenarioMetadata,
  scorePlayerMarks,
  submitSurveyMark,
} from "../src/reference-game.mjs";
import coverage from "./coverage.json" with { type: "json" };

assert.equal(referenceGame.id, "roll-and-write-scorecard");
assert.equal(referenceGame.coverage.scenarioId, coverage.scenarioId);
assert.equal(referenceGame.rulesBrief, "Cloudline Survey");
assert.equal(referenceGame.players.min, 1);
assert.equal(referenceGame.players.max, 4);
assert.equal(referenceGame.loop.rounds, 8);
assert.equal(referenceGame.loop.activeRoll.total, 5);
assert.equal(referenceGame.guidance.phase.label, "Mark the survey grid");
assert.equal(referenceGame.guidance.setup.steps.length, 2);
assert.deepEqual(referenceGame.loop.seededRolls[0].dice, [2, 3]);
assert.equal(referenceGame.loop.seededRolls.length, 8);
assert.equal(referenceGame.scorecard.boardId, "survey-grid");
assert.equal(referenceGame.scorecard.scope, "perPlayer");
assert.equal(referenceGame.scorecard.cells.length, 16);
assert.deepEqual(
  referenceGame.scorecard.cells.find((cell) => cell.id === "cell-0-1"),
  { id: "cell-0-1", row: 0, col: 1, target: 5 },
);
assert.ok(coverage.replay.eligibleSpaceIds.includes(coverage.replay.spaceId));
assert.ok(referenceGame.interactions.some((item) => item.id === "mark-cell"));
assert.equal(
  referenceGame.interactions.find((item) => item.id === "mark-cell").label,
  "Mark cell",
);
assert.equal(
  referenceGame.interactions.find((item) => item.id === "roll-first")
    .blockedReason,
  "Roll first, then choose a matching unmarked cell.",
);
assert.ok(
  referenceGame.interactions.some(
    (item) => item.collector === "boardTarget.playerSpace",
  ),
);
assert.ok(coverage.uiPatterns.includes("square-board-targets"));
assert.deepEqual(Object.keys(coverage.scenarios), [
  "initial",
  "dice",
  "draft",
  "submitted",
  "invalid",
  "complete",
]);
assert.equal(scenarioMetadata.initial.state.phase, "roll");
assert.equal(scenarioMetadata.initial.state.roll, null);
assert.equal(scenarioMetadata.dice.state.phase, "markSurvey");
assert.equal(scenarioMetadata.dice.state.roll.total, 5);
assert.deepEqual(legalSurveyTargets(scenarioMetadata.dice.state, "player-1"), [
  "cell-0-1",
  "cell-3-2",
]);
assert.equal(scenarioMetadata.draft.state.draft.cellId, "cell-0-1");
assert.equal(
  scenarioMetadata.draft.state.marks["player-1"]["cell-0-1"],
  undefined,
);
assert.equal(scenarioMetadata.submitted.result.accepted, true);
assert.deepEqual(
  scenarioMetadata.submitted.result.state.marks["player-1"]["cell-0-1"],
  { kind: "surveyed", round: 1, rolledTotal: 5 },
);
assert.equal(
  scenarioMetadata.submitted.result.state.playerIds[
    scenarioMetadata.submitted.result.state.activePlayerIndex
  ],
  "player-2",
);
assert.equal(scenarioMetadata.invalid.result.accepted, false);
assert.equal(
  scenarioMetadata.invalid.result.validation.errorCode,
  "CELL_DOES_NOT_MATCH_ROLL",
);
assert.equal(scenarioMetadata.invalid.staleResult.accepted, false);
assert.equal(
  scenarioMetadata.invalid.staleResult.validation.errorCode,
  "STALE_SUBMISSION",
);
assert.equal(
  submitSurveyMark(scenarioMetadata.dice.state, {
    playerId: "player-2",
    cellId: "cell-0-1",
  }).validation.errorCode,
  "PLAYER_NOT_ACTIVE",
);
assert.equal(scenarioMetadata.complete.state.phase, "complete");
assert.equal(scenarioMetadata.complete.state.completed, true);
assert.ok(scenarioMetadata.complete.state.scores["player-1"].total > 0);
assert.deepEqual(
  Object.keys(scenarioMetadata.complete.state.scores["player-1"].components),
  ["completeRows", "completeColumns", "largestRegion", "failedSurveys"],
);
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
console.log(`${referenceGame.id}: scenario coverage verified`);
