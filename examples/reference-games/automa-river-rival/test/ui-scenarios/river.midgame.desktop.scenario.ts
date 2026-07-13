export const scenario = {
  id: "automa-river-rival.river.midgame.desktop",
  title: "River Guild: mid-race instruction history",
  behaviorScenario: "test/scenarios/complete-game.scenario.ts",
  at: "midgame",
  contracts: ["CardCollection", "InteractionSubmit", "Panel", "PluginRuntime"],
  capabilities: [
    "pointer",
    "keyboard",
    "procedure-history",
    "public-warehouses",
  ],
  sourceFiles: [
    "examples/reference-games/automa-river-rival/reference-game.json",
    "examples/reference-games/automa-river-rival/rule.md",
    "examples/reference-games/automa-river-rival/manifest.ts",
    "examples/reference-games/automa-river-rival/app/game.ts",
    "examples/reference-games/automa-river-rival/app/phases/human-turn.ts",
    "examples/reference-games/automa-river-rival/app/phases/rival-procedure.ts",
    "examples/reference-games/automa-river-rival/app/player-view.ts",
    "examples/reference-games/automa-river-rival/ui/App.tsx",
    "examples/reference-games/automa-river-rival/ui/style.css",
    "examples/reference-games/automa-river-rival/test/scenarios/complete-game.scenario.ts",
  ],
  viewer: { seatId: "player-1", playerId: "player-1" },
  environment: {
    viewport: "desktop",
    browsers: ["chromium", "webkit"],
    input: ["pointer", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
