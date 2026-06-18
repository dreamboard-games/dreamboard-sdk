import { defineAutomaRiverBranch } from "./_branch-scenarios.mjs";

export const scenario = defineAutomaRiverBranch({
  id: "automa-river-rival.claim-cargo.initial.mobile",
  key: "claimHighest",
  assertion: "initial automa branch shows rival state without fake seats",
  sourceFile:
    "examples/reference-games/automa-river-rival/src/scenarios/initial.scenario.mjs",
});
