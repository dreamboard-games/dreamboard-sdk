export default {
  id: "deck-building-market.terminal-outcome.mobile",
  title: "Sketchbook: final ranked portfolios",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: { segment: "when", completed: 1 },
  contracts: ["Outcome", "Panel", "PlayerScore", "PluginRuntime"],
  capabilities: ["competition-ranking", "supply-ending", "touch"],
  sourceFiles: [
    "examples/reference-games/deck-building-market/app/phases/check-game-end.ts",
    "examples/reference-games/deck-building-market/app/phases/game-over.ts",
    "examples/reference-games/deck-building-market/ui/components/game-ui.tsx",
    "examples/reference-games/deck-building-market/test/scenarios/complete-game.scenario.ts",
  ],
  viewer: { seatId: "player-2", playerId: "player-2" },
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;
