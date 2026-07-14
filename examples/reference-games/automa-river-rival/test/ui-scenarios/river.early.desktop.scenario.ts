export const scenario = {
  id: "automa-river-rival.river.early.desktop",
  title: "River Guild: first cargo claimed",
  behaviorScenario: "test/scenarios/complete-game.scenario.ts",
  at: "first-cargo",
  contracts: ["CardCollection", "InteractionSubmit", "Panel", "PluginRuntime"],
  capabilities: ["pointer", "keyboard", "exact-position-refill", "seat-order"],
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
  viewer: { seatId: "player-2", playerId: "player-2" },
  environment: {
    viewport: "desktop",
    browsers: ["chromium", "webkit"],
    input: ["pointer", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
