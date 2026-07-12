export default {
  id: "deck-building-market.depleted-supply.desktop",
  title: "Sketchbook: depleted supplies wait for cleanup",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: { segment: "given", completed: 361 },
  contracts: ["CardCollection", "InteractionSubmit", "Panel", "PluginRuntime"],
  capabilities: ["depleted-piles", "deferred-ending", "supply-counts"],
  sourceFiles: [
    "examples/reference-games/deck-building-market/app/phases/check-game-end.ts",
    "examples/reference-games/deck-building-market/app/player-view.ts",
    "examples/reference-games/deck-building-market/ui/components/game-ui.tsx",
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
