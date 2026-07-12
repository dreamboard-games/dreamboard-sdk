export default {
  id: "deck-building-market.technique-chain.desktop",
  title: "Sketchbook: Studio chains into Brainstorm",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: { segment: "given", completed: 62 },
  contracts: ["Card", "Hand", "InteractionSubmit", "Panel"],
  capabilities: ["action-chain", "card-draw", "public-in-play"],
  sourceFiles: [
    "examples/reference-games/deck-building-market/app/cards/studio.ts",
    "examples/reference-games/deck-building-market/app/cards/brainstorm.ts",
    "examples/reference-games/deck-building-market/ui/interaction-routes.tsx",
    "examples/reference-games/deck-building-market/test/scenarios/complete-game.scenario.ts",
  ],
  viewer: { seatId: "player-2", playerId: "player-2" },
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["pointer", "keyboard"],
  },
  replay: [],
} as const;
