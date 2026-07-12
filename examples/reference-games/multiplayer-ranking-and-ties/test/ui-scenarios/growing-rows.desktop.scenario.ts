export const scenario = {
  id: "multiplayer-ranking-and-ties.growing-rows.desktop",
  title: "Harbor Fair: public festival rows after three rounds",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: { segment: "given", completed: 12 },
  contracts: ["Panel", "PlayerScore"],
  capabilities: ["festival-rows", "guild-sets", "public-information"],
  sourceFiles: [
    "examples/reference-games/multiplayer-ranking-and-ties/reference-game.json",
    "examples/reference-games/multiplayer-ranking-and-ties/rule.md",
    "examples/reference-games/multiplayer-ranking-and-ties/app/game.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/ui/App.tsx",
    "examples/reference-games/multiplayer-ranking-and-ties/test/scenarios/complete-game.scenario.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/test/ui-scenarios/growing-rows.desktop.scenario.ts",
  ],
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
