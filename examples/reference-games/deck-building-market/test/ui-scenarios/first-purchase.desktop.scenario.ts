export default {
  id: "deck-building-market.first-purchase.desktop",
  title: "Sketchbook: first Studio enters the public discard",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: { segment: "given", completed: 5 },
  contracts: ["CardCollection", "Hand", "InteractionSubmit", "Panel"],
  capabilities: ["individual-inspiration", "purchase", "public-discard"],
  sourceFiles: [
    "examples/reference-games/deck-building-market/app/phases/player-turn/interactions/buy.ts",
    "examples/reference-games/deck-building-market/app/player-view.ts",
    "examples/reference-games/deck-building-market/ui/components/game-ui.tsx",
    "examples/reference-games/deck-building-market/test/scenarios/complete-game.scenario.ts",
  ],
  viewer: { seatId: "player-1", playerId: "player-1" },
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["pointer", "keyboard"],
  },
  replay: [],
} as const;
