export default {
  id: "worker-placement-tableau.outcome.mobile",
  title: "Mosaic Workshop: final Prestige",
  behaviorScenario: "test/scenarios/complete-game.scenario.ts",
  at: { segment: "when", completed: 8 },
  contracts: [
    "Board.Space",
    "InteractionSubmit",
    "InteractionInput",
    "PluginRuntime",
  ],
  capabilities: [
    "authoritative-outcome",
    "ranked-standings",
    "score-breakdown",
  ],
  sourceFiles: [
    "examples/reference-games/worker-placement-tableau/manifest.ts",
    "examples/reference-games/worker-placement-tableau/rule.md",
    "examples/reference-games/worker-placement-tableau/app/phases/scoring.ts",
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
