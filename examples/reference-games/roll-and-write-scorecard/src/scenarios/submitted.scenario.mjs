import { defineRollAndWriteBranch } from "./_branch-scenarios.mjs";

export const scenario = defineRollAndWriteBranch({
  id: "roll-and-write-scorecard.mark-cell.submitted.mobile",
  key: "submitted",
  assertion: "submitted scorecard state advances seat-order resolution",
  sourceFile:
    "examples/reference-games/roll-and-write-scorecard/src/scenarios/submitted.scenario.mjs",
});
