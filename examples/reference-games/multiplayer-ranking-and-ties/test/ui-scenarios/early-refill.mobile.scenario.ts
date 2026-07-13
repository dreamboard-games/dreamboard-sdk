export const scenario = {
  id: "multiplayer-ranking-and-ties.early-refill.mobile",
  title: "Harbor Fair: draft and automatic refill",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: "opening",
  contracts: ["InteractionSubmit", "Panel", "PluginRuntime"],
  capabilities: ["runtime-submit", "touch", "keyboard", "market-row"],
  sourceFiles: [
    "examples/reference-games/multiplayer-ranking-and-ties/reference-game.json",
    "examples/reference-games/multiplayer-ranking-and-ties/rule.md",
    "examples/reference-games/multiplayer-ranking-and-ties/manifest.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/game.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/app/phases/drafting.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/ui/App.tsx",
    "examples/reference-games/multiplayer-ranking-and-ties/test/scenarios/complete-game.scenario.ts",
    "examples/reference-games/multiplayer-ranking-and-ties/test/ui-scenarios/early-refill.mobile.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [
    {
      kind: "card-target",
      interactionId: "draftStall",
      inputKey: "stallId",
      cardId: "music-p2-c0-2",
    },
  ],
} as const;

export default scenario;
