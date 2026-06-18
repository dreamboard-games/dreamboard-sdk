import { defineRollAndWriteBranch } from "./_branch-scenarios.mjs";

export const scenario = defineRollAndWriteBranch({
  id: "roll-and-write-scorecard.mark-cell.invalid.mobile",
  key: "invalid",
  assertion: "invalid scorecard state retains reducer-owned error evidence",
  sourceFile:
    "examples/reference-games/roll-and-write-scorecard/src/scenarios/invalid.scenario.mjs",
});
