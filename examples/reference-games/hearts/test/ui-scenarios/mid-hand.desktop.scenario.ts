export const scenario = {
  id: "hearts.mid-hand.desktop",
  title: "Hearts: seven-trick mid-hand table",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: { segment: "given", completed: 32 },
  contracts: ["Card", "Hand", "Panel", "PlayerScore", "Table"],
  capabilities: ["trick-history", "captured-penalties", "private-hand"],
  sourceFiles: [
    "examples/reference-games/hearts/rule.md",
    "examples/reference-games/hearts/app/phases/playing.ts",
    "examples/reference-games/hearts/app/player-view.ts",
    "examples/reference-games/hearts/ui/components/game-ui.tsx",
    "examples/reference-games/hearts/test/scenarios/complete-game.scenario.ts",
  ],
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
