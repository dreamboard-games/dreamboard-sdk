export const scenario = {
  id: "hearts.final-outcome.mobile",
  title: "Hearts: one-hand final standings",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: "game-over",
  contracts: ["Outcome", "Panel", "PlayerScore", "Table"],
  capabilities: ["competition-ranking", "low-score-winner", "touch"],
  sourceFiles: [
    "examples/reference-games/hearts/rule.md",
    "examples/reference-games/hearts/app/phases/scoreHand.ts",
    "examples/reference-games/hearts/app/player-view.ts",
    "examples/reference-games/hearts/ui/components/game-ui.tsx",
    "examples/reference-games/hearts/test/scenarios/complete-game.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
