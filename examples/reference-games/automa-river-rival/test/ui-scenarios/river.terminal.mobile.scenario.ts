export const scenario = {
  id: "automa-river-rival.river.terminal.mobile",
  title: "River Guild: cooperative outcome",
  behaviorScenario: "test/scenarios/complete-game.scenario.ts",
  at: { segment: "when", completed: 2 },
  contracts: ["CardCollection", "InteractionSubmit", "Panel", "PluginRuntime"],
  capabilities: ["touch", "keyboard", "cooperative-outcome", "score-breakdown"],
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
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
