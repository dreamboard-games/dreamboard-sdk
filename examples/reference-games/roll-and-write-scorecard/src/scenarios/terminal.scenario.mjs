import { defineRollAndWriteBranch } from "./_branch-scenarios.mjs";

export const scenario = defineRollAndWriteBranch({
  id: "roll-and-write-scorecard.mark-cell.terminal.mobile",
  key: "complete",
  assertion: "terminal scorecard state carries reducer-owned scoring evidence",
  sourceFile:
    "examples/reference-games/roll-and-write-scorecard/src/scenarios/terminal.scenario.mjs",
});
