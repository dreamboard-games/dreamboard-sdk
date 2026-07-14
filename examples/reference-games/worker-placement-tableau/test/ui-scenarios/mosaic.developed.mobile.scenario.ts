export default {
  id: "worker-placement-tableau.developed.mobile",
  title: "Mosaic Workshop: developed tableau",
  behaviorScenario: "test/scenarios/complete-game.scenario.ts",
  at: "late-game",
  contracts: [
    "Board.Space",
    "InteractionSubmit",
    "InteractionInput",
    "PluginRuntime",
  ],
  capabilities: ["responsive-tableau", "running-score", "public-resources"],
  sourceFiles: [
    "examples/reference-games/worker-placement-tableau/manifest.ts",
    "examples/reference-games/worker-placement-tableau/rule.md",
    "examples/reference-games/worker-placement-tableau/app/player-view.ts",
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
