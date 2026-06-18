import { defineSoloCountdownBranch } from "./_branch-scenarios.mjs";

export const scenario = defineSoloCountdownBranch({
  id: "solo-countdown-puzzle.repair-beacon.terminal.mobile",
  key: "countdownLoss",
  assertion: "terminal solo branch carries countdown loss evidence",
  sourceFile:
    "examples/reference-games/solo-countdown-puzzle/src/scenarios/terminal.scenario.mjs",
});
