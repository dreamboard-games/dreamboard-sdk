import { defineRollAndWriteBranch } from "./_branch-scenarios.mjs";

export const scenario = defineRollAndWriteBranch({
  id: "roll-and-write-scorecard.mark-cell.initial.mobile",
  key: "initial",
  assertion: "initial scorecard state appears before the first seeded roll",
  sourceFile:
    "examples/reference-games/roll-and-write-scorecard/src/scenarios/initial.scenario.mjs",
});
