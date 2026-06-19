export const scenario = {
  id: "multiplayer-ranking-and-ties.tie-break.desktop",
  title: "Multiplayer Ranking And Ties: tie-break outcome evidence",
  behaviorScenario: "test/scenarios/outcomes.scenario.ts",
  contracts: ["Outcome", "Panel", "PlayerScore", "Table"],
  capabilities: ["standings-table", "tie-break-evidence"],
  sourceFiles: [
    "examples/reference-games/multiplayer-ranking-and-ties/reference-game.json",
    "examples/reference-games/multiplayer-ranking-and-ties/rule.md",
    "examples/reference-games/multiplayer-ranking-and-ties/manifest.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/game.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/game-contract.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/phases/draft-flow.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/phases/scenarios.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/ui/App.tsx",
    "examples/reference-games/multiplayer-ranking-and-ties/test/scenarios/outcomes.scenario.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/test/ui-scenarios/tie-break.desktop.scenario.tsx",
  ],
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
