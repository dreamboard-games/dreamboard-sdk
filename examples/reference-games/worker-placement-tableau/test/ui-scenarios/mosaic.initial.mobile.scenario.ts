export default {
  id: "worker-placement-tableau.initial.mobile",
  title: "Mosaic Workshop: opening supplies",
  behaviorScenario: "test/scenarios/complete-game.scenario.ts",
  at: "opening",
  contracts: [
    "Board.Space",
    "InteractionSubmit",
    "InteractionInput",
    "PluginRuntime",
  ],
  capabilities: ["pointer", "keyboard", "responsive-tableau"],
  sourceFiles: [
    "examples/reference-games/worker-placement-tableau/manifest.ts",
    "examples/reference-games/worker-placement-tableau/rule.md",
    "examples/reference-games/worker-placement-tableau/app/game.ts",
    "examples/reference-games/worker-placement-tableau/ui/App.tsx",
    "examples/reference-games/worker-placement-tableau/test/scenarios/complete-game.scenario.ts",
  ],
  viewer: { seatId: "player-1", playerId: "player-1" },
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["pointer", "keyboard"],
  },
  replay: [],
} as const;
