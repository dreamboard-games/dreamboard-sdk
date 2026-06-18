import { defineAutomaRiverBranch } from "./_branch-scenarios.mjs";

export const scenario = defineAutomaRiverBranch({
  id: "automa-river-rival.claim-cargo.live-update.mobile",
  key: "claimKind",
  assertion: "live automa branch appends rival action events",
  sourceFile:
    "examples/reference-games/automa-river-rival/src/scenarios/live-update.scenario.mjs",
});
