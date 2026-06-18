import { defineSoloCountdownBranch } from "./_branch-scenarios.mjs";

export const scenario = defineSoloCountdownBranch({
  id: "solo-countdown-puzzle.repair-beacon.initial.mobile",
  key: "initial",
  assertion: "initial solo branch has one human player and no event history",
  sourceFile:
    "examples/reference-games/solo-countdown-puzzle/src/scenarios/initial.scenario.mjs",
});
