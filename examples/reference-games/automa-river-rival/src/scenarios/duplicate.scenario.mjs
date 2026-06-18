import { defineAutomaRiverBranch } from "./_branch-scenarios.mjs";

export const scenario = defineAutomaRiverBranch({
  id: "automa-river-rival.claim-cargo.duplicate.mobile",
  key: "claimHighestTie",
  assertion: "duplicate automa branch preserves committed rival events",
  initialSystemEventProcedureIds: [
    "rival-instruction-revealed",
    "rival-cargo-claimed",
  ],
  sourceFile:
    "examples/reference-games/automa-river-rival/src/scenarios/duplicate.scenario.mjs",
});
