import { defineAutomaRiverBranch } from "./_branch-scenarios.mjs";

export const scenario = defineAutomaRiverBranch({
  id: "automa-river-rival.claim-cargo.terminal.mobile",
  key: "terminal",
  assertion: "terminal automa branch carries cooperative outcome evidence",
  sourceFile:
    "examples/reference-games/automa-river-rival/src/scenarios/terminal.scenario.mjs",
});
