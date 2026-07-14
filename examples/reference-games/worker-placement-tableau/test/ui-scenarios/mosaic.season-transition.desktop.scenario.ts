export default {
  id: "worker-placement-tableau.season-transition.desktop",
  title: "Mosaic Workshop: second season begins",
  behaviorScenario: "test/scenarios/complete-game.scenario.ts",
  at: "season-two",
  contracts: [
    "Board.Space",
    "InteractionSubmit",
    "InteractionInput",
    "PluginRuntime",
  ],
  capabilities: [
    "automatic-cleanup",
    "alternating-first-player",
    "worker-return",
  ],
  sourceFiles: [
    "examples/reference-games/worker-placement-tableau/manifest.ts",
    "examples/reference-games/worker-placement-tableau/rule.md",
    "examples/reference-games/worker-placement-tableau/app/phases/cleanup.ts",
    "examples/reference-games/worker-placement-tableau/ui/App.tsx",
    "examples/reference-games/worker-placement-tableau/test/scenarios/complete-game.scenario.ts",
  ],
  viewer: { seatId: "player-2", playerId: "player-2" },
  environment: {
    viewport: "desktop",
    browsers: ["chromium", "webkit"],
    input: ["pointer", "keyboard"],
  },
  replay: [],
} as const;
