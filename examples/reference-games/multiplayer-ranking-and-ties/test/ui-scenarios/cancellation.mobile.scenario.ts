export const scenario = {
  id: "multiplayer-ranking-and-ties.cancellation.mobile",
  title: "Harbor Fair: scoreless final-refill cancellation",
  behaviorScenario:
    "../scenarios/refill-and-cancellation-final-refill.scenario.ts",
  at: "cancelled",
  contracts: ["Outcome", "Panel", "Table"],
  capabilities: ["scoreless-outcome", "storm-history", "touch"],
  sourceFiles: [
    "examples/reference-games/multiplayer-ranking-and-ties/reference-game.json",
    "examples/reference-games/multiplayer-ranking-and-ties/rule.md",
    "examples/reference-games/multiplayer-ranking-and-ties/app/game.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/rules.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/ui/App.tsx",
    "examples/reference-games/multiplayer-ranking-and-ties/test/scenarios/refill-and-cancellation-final-refill.scenario.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/test/ui-scenarios/cancellation.mobile.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
