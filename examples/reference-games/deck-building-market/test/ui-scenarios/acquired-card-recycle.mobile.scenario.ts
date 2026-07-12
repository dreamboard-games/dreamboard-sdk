export default {
  id: "deck-building-market.acquired-card-recycle.mobile",
  title: "Sketchbook: acquired Brainstorm returns in a later hand",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: { segment: "given", completed: 26 },
  contracts: ["Card", "Hand", "Panel", "PluginRuntime"],
  capabilities: ["growing-deck", "private-hand", "seeded-reshuffle", "touch"],
  sourceFiles: [
    "examples/reference-games/deck-building-market/app/effects/deck.ts",
    "examples/reference-games/deck-building-market/app/player-view.ts",
    "examples/reference-games/deck-building-market/ui/components/game-ui.tsx",
    "examples/reference-games/deck-building-market/test/scenarios/complete-game.scenario.ts",
  ],
  viewer: { seatId: "player-1", playerId: "player-1" },
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;
