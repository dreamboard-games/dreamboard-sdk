export const scenario = {
  id: "hearts.first-trick.desktop",
  title: "Hearts: first completed trick",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: "first-trick",
  contracts: ["Card", "Hand", "Panel", "Table"],
  capabilities: ["trick-history", "card-eligibility", "public-information"],
  sourceFiles: [
    "examples/reference-games/hearts/rule.md",
    "examples/reference-games/hearts/app/phases/playing.ts",
    "examples/reference-games/hearts/app/player-view.ts",
    "examples/reference-games/hearts/ui/components/game-ui.tsx",
    "examples/reference-games/hearts/ui/components/trick-area.tsx",
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
