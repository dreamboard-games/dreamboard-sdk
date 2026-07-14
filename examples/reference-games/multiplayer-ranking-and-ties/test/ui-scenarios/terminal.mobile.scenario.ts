export const scenario = {
  id: "multiplayer-ranking-and-ties.terminal.mobile",
  title: "Harbor Fair: ranked terminal evidence",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: "game-over",
  contracts: ["Outcome", "Panel", "PlayerScore", "Table"],
  capabilities: ["standings-table", "tie-break-evidence", "competition-ranks"],
  sourceFiles: [
    "examples/reference-games/multiplayer-ranking-and-ties/reference-game.json",
    "examples/reference-games/multiplayer-ranking-and-ties/rule.md",
    "examples/reference-games/multiplayer-ranking-and-ties/app/game.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/rules.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/ui/App.tsx",
    "examples/reference-games/multiplayer-ranking-and-ties/test/scenarios/complete-game.scenario.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/test/ui-scenarios/terminal.mobile.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
