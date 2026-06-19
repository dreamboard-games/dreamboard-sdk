import behaviorScenario from "../scenarios/reconnect.scenario.ts";

export const scenario = {
  id: "automa-river-rival.claim-cargo.reconnect.mobile",
  title: "Automa River Rival: reconnect restores rival event history",
  behaviorScenario,
  contracts: ["GameEventLog", "InteractionSubmit", "Panel"],
  capabilities: ["event-log", "reconnect"],
  sourceFiles: [
    "examples/reference-games/automa-river-rival/reference-game.json",
    "examples/reference-games/automa-river-rival/rule.md",
    "examples/reference-games/automa-river-rival/manifest.ts",
    "examples/reference-games/automa-river-rival/app/game.ts",
    "examples/reference-games/automa-river-rival/app/phases/rival-procedure.ts",
    "examples/reference-games/automa-river-rival/ui/App.tsx",
    "examples/reference-games/automa-river-rival/test/scenarios/reconnect.scenario.ts",
    "examples/reference-games/automa-river-rival/test/ui-scenarios/reconnect.mobile.scenario.ts",
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
