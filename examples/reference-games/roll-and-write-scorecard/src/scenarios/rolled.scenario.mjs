import { defineRollAndWriteBranch } from "./_branch-scenarios.mjs";

export const scenario = defineRollAndWriteBranch({
  id: "roll-and-write-scorecard.mark-cell.rolled.mobile",
  key: "dice",
  assertion:
    "rolled scorecard state highlights legal cells for the seeded total",
  sourceFile:
    "examples/reference-games/roll-and-write-scorecard/src/scenarios/rolled.scenario.mjs",
});
