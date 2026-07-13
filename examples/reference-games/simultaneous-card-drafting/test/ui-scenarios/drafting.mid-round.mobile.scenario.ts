export const scenario = {
  id: "simultaneous-card-drafting.drafting.mid-round.mobile",
  title: "Lantern Market: sealed choice waiting mid-round",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: "mid-round",
  contracts: ["HandView", "InteractionSubmit", "Panel", "PluginRuntime"],
  capabilities: [
    "touch",
    "private-hand",
    "locked-choice",
    "commit-status",
    "public-stall",
  ],
  sourceFiles: [
    "examples/reference-games/simultaneous-card-drafting/reference-game.json",
    "examples/reference-games/simultaneous-card-drafting/rule.md",
    "examples/reference-games/simultaneous-card-drafting/app/game.ts",
    "examples/reference-games/simultaneous-card-drafting/app/phases/drafting.ts",
    "examples/reference-games/simultaneous-card-drafting/app/player-view.ts",
    "examples/reference-games/simultaneous-card-drafting/ui/App.tsx",
    "examples/reference-games/simultaneous-card-drafting/ui/components/game-ui.tsx",
    "examples/reference-games/simultaneous-card-drafting/test/scenarios/complete-game.scenario.ts",
    "examples/reference-games/simultaneous-card-drafting/test/ui-scenarios/drafting.mid-round.mobile.scenario.ts",
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
