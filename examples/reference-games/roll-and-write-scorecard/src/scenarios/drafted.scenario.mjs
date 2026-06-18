import { defineRollAndWriteBranch } from "./_branch-scenarios.mjs";

export const scenario = defineRollAndWriteBranch({
  id: "roll-and-write-scorecard.mark-cell.drafted.mobile",
  key: "draft",
  assertion: "drafted scorecard state preserves a pending mark before submit",
  sourceFile:
    "examples/reference-games/roll-and-write-scorecard/src/scenarios/drafted.scenario.mjs",
});
