import behaviorScenario from "../scenarios/terminal.scenario.ts";

export const scenario = {
  id: "automa-river-rival.claim-cargo.terminal.mobile",
  title: "Automa River Rival: terminal cooperative outcome evidence",
  behaviorScenario,
  contracts: ["GameEventLog", "InteractionSubmit", "Panel"],
  capabilities: ["cooperative-outcome", "event-log"],
  sourceFiles: [
    "examples/reference-games/automa-river-rival/reference-game.json",
    "examples/reference-games/automa-river-rival/rule.md",
    "examples/reference-games/automa-river-rival/manifest.ts",
    "examples/reference-games/automa-river-rival/app/game.ts",
    "examples/reference-games/automa-river-rival/app/phases/human-turn.ts",
    "examples/reference-games/automa-river-rival/app/phases/rival-procedure.ts",
    "examples/reference-games/automa-river-rival/ui/App.tsx",
    "examples/reference-games/automa-river-rival/test/scenarios/terminal.scenario.ts",
    "examples/reference-games/automa-river-rival/test/ui-scenarios/terminal.mobile.scenario.ts",
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
