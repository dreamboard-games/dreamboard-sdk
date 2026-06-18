import { defineAutomaRiverBranch } from "./_branch-scenarios.mjs";

export const scenario = defineAutomaRiverBranch({
  id: "automa-river-rival.claim-cargo.reconnect.mobile",
  key: "claimKindFallback",
  assertion: "reconnect automa branch restores rival event history",
  initialSystemEventProcedureIds: [
    "rival-instruction-revealed",
    "rival-cargo-claimed",
    "river-refilled",
  ],
  sourceFile:
    "examples/reference-games/automa-river-rival/src/scenarios/reconnect.scenario.mjs",
});
