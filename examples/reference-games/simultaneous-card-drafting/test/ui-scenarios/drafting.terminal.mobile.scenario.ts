export const scenario = {
  id: "simultaneous-card-drafting.drafting.terminal.mobile",
  title: "Lantern Market: terminal two-round standings",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: { segment: "when", completed: 2 },
  contracts: ["Panel", "PluginRuntime"],
  capabilities: [
    "touch",
    "terminal-outcome",
    "competition-ranking",
    "round-history",
  ],
  sourceFiles: [
    "examples/reference-games/simultaneous-card-drafting/reference-game.json",
    "examples/reference-games/simultaneous-card-drafting/rule.md",
    "examples/reference-games/simultaneous-card-drafting/app/game.ts",
    "examples/reference-games/simultaneous-card-drafting/app/phases/scoreRound.ts",
    "examples/reference-games/simultaneous-card-drafting/app/rules/scoring.ts",
    "examples/reference-games/simultaneous-card-drafting/ui/App.tsx",
    "examples/reference-games/simultaneous-card-drafting/ui/components/game-ui.tsx",
    "examples/reference-games/simultaneous-card-drafting/test/scenarios/complete-game.scenario.ts",
    "examples/reference-games/simultaneous-card-drafting/test/ui-scenarios/drafting.terminal.mobile.scenario.ts",
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
