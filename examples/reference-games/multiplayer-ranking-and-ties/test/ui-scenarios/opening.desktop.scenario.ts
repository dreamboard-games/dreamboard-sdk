export const scenario = {
  id: "multiplayer-ranking-and-ties.opening.desktop",
  title: "Harbor Fair: opening four-stall market",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: { segment: "setup", completed: 0 },
  contracts: ["InteractionSubmit", "Panel"],
  capabilities: ["market-row", "public-information"],
  sourceFiles: [
    "examples/reference-games/multiplayer-ranking-and-ties/reference-game.json",
    "examples/reference-games/multiplayer-ranking-and-ties/rule.md",
    "examples/reference-games/multiplayer-ranking-and-ties/manifest.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/game.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/ui/App.tsx",
    "examples/reference-games/multiplayer-ranking-and-ties/test/scenarios/complete-game.scenario.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/test/ui-scenarios/opening.desktop.scenario.ts",
  ],
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
