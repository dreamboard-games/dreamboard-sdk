import behaviorScenario from "../scenarios/claim-cargo.scenario.ts";

export const scenario = {
  id: "automa-river-rival.claim-cargo.mobile",
  title: "Automa River Rival: claim cargo resolves rival procedure",
  behaviorScenario,
  contracts: ["GameEventLog", "InteractionSubmit", "Panel", "PluginRuntime"],
  capabilities: ["touch", "runtime-submit", "event-log"],
  sourceFiles: [
    "examples/reference-games/automa-river-rival/reference-game.json",
    "examples/reference-games/automa-river-rival/rule.md",
    "examples/reference-games/automa-river-rival/manifest.ts",
    "examples/reference-games/automa-river-rival/app/game.ts",
    "examples/reference-games/automa-river-rival/app/phases/human-turn.ts",
    "examples/reference-games/automa-river-rival/app/phases/rival-procedure.ts",
    "examples/reference-games/automa-river-rival/ui/App.tsx",
    "examples/reference-games/automa-river-rival/ui/interaction-routes.tsx",
    "examples/reference-games/automa-river-rival/test/scenarios/claim-cargo.scenario.ts",
    "examples/reference-games/automa-river-rival/test/ui-scenarios/claim-cargo.mobile.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [
    {
      kind: "submit",
      interactionId: "claimCargo",
    },
  ],
} as const;

export default scenario;
