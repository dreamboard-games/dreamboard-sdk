import { defineSoloCountdownBranch } from "./_branch-scenarios.mjs";

export const scenario = defineSoloCountdownBranch({
  id: "solo-countdown-puzzle.repair-beacon.live-update.mobile",
  key: "weather",
  assertion: "live solo branch appends deterministic weather events",
  sourceFile:
    "examples/reference-games/solo-countdown-puzzle/src/scenarios/live-update.scenario.mjs",
});
