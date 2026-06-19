export const scenario = {
  id: "multiplayer-ranking-and-ties.draft-stall.desktop",
  title: "Multiplayer Ranking And Ties: draft a stall from the market",
  behaviorScenario: "test/scenarios/draft-stall-ready.scenario.ts",
  contracts: ["Card", "CardCollection", "InteractionSubmit", "Panel"],
  capabilities: ["click", "runtime-submit", "market-row", "card-target"],
  sourceFiles: [
    "examples/reference-games/multiplayer-ranking-and-ties/reference-game.json",
    "examples/reference-games/multiplayer-ranking-and-ties/rule.md",
    "examples/reference-games/multiplayer-ranking-and-ties/manifest.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/game.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/phases/draft-flow.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/phases/drafting.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/phases/scenarios.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/ui/App.tsx",
    "examples/reference-games/multiplayer-ranking-and-ties/ui/interaction-routes.tsx",
    "examples/reference-games/multiplayer-ranking-and-ties/test/scenarios/draft-stall-ready.scenario.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/test/ui-scenarios/draft-stall.desktop.scenario.tsx",
  ],
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [
    {
      kind: "submit",
      interactionId: "draftStall",
      params: {
        cardId: "food-p3-c0-1",
      },
    },
  ],
} as const;

export default scenario;
