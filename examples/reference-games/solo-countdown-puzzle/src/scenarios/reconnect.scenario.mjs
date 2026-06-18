import { defineSoloCountdownBranch } from "./_branch-scenarios.mjs";

export const scenario = defineSoloCountdownBranch({
  id: "solo-countdown-puzzle.repair-beacon.reconnect.mobile",
  key: "reinforced",
  assertion: "reconnect solo branch restores committed system events",
  initialSystemEventProcedureIds: ["resolve-weather", "advance-countdown"],
  sourceFile:
    "examples/reference-games/solo-countdown-puzzle/src/scenarios/reconnect.scenario.mjs",
});
