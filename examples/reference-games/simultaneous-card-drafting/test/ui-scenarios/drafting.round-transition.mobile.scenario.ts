export const scenario = {
  id: "simultaneous-card-drafting.drafting.round-transition.mobile",
  title: "Lantern Market: round two opens with preserved scores",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: "round-transition",
  contracts: ["HandView", "Panel", "PluginRuntime"],
  capabilities: [
    "touch",
    "round-transition",
    "round-history",
    "fresh-private-hand",
  ],
  sourceFiles: [
    "examples/reference-games/simultaneous-card-drafting/reference-game.json",
    "examples/reference-games/simultaneous-card-drafting/rule.md",
    "examples/reference-games/simultaneous-card-drafting/app/game.ts",
    "examples/reference-games/simultaneous-card-drafting/app/phases/scoreRound.ts",
    "examples/reference-games/simultaneous-card-drafting/app/player-view.ts",
    "examples/reference-games/simultaneous-card-drafting/ui/App.tsx",
    "examples/reference-games/simultaneous-card-drafting/ui/components/game-ui.tsx",
    "examples/reference-games/simultaneous-card-drafting/test/scenarios/complete-game.scenario.ts",
    "examples/reference-games/simultaneous-card-drafting/test/ui-scenarios/drafting.round-transition.mobile.scenario.ts",
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
