export default {
  id: "deck-building-market.opening-hand.desktop",
  title: "Sketchbook: private opening hand and full studio shelf",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: "opening",
  contracts: ["Card", "Hand", "InteractionSubmit", "PluginRuntime"],
  capabilities: ["private-hand", "normal-setup", "public-supply"],
  sourceFiles: [
    "examples/reference-games/deck-building-market/rule.md",
    "examples/reference-games/deck-building-market/manifest.ts",
    "examples/reference-games/deck-building-market/app/phases/setup.ts",
    "examples/reference-games/deck-building-market/ui/App.tsx",
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
