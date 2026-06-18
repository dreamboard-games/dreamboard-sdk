import assert from "node:assert/strict";
import {
  referenceGame,
  scenarioMetadata,
} from "../../../src/reference-game.mjs";
import coverage from "../../../scenarios/coverage.json" with { type: "json" };

export const scenarioSkeleton = {
  id: "roll-and-write-scorecard.mark-cell.mobile",
  viewport: "phone",
  input: "board-space",
  board: "survey-grid",
};

assert.equal(scenarioSkeleton.id, "roll-and-write-scorecard.mark-cell.mobile");
assert.equal(scenarioSkeleton.viewport, "phone");
assert.equal(scenarioSkeleton.board, "survey-grid");
assert.equal(referenceGame.id, "roll-and-write-scorecard");
assert.equal(coverage.scenarioId, scenarioSkeleton.id);
assert.equal(scenarioMetadata.dice.state.roll.total, 5);
assert.deepEqual(scenarioMetadata.dice.legalSpaceIds, ["cell-0-1", "cell-3-2"]);
assert.equal(scenarioMetadata.submitted.result.accepted, true);
assert.equal(
  scenarioMetadata.invalid.result.validation.errorCode,
  "CELL_DOES_NOT_MATCH_ROLL",
);
assert.equal(scenarioMetadata.complete.state.completed, true);

console.log(
  `${scenarioSkeleton.id}: demo workspace scenario skeleton verified`,
);
