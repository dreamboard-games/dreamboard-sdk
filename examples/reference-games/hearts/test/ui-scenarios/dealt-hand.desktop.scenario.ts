export const scenario = {
  id: "hearts.dealt-hand.desktop",
  title: "Hearts: private dealt hand and pass selection",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: "opening",
  contracts: ["Card", "Hand", "InteractionSubmit", "PluginRuntime"],
  capabilities: ["private-hand", "multi-select", "runtime-submit"],
  sourceFiles: [
    "examples/reference-games/hearts/rule.md",
    "examples/reference-games/hearts/manifest.ts",
    "examples/reference-games/hearts/app/phases/setup.ts",
    "examples/reference-games/hearts/app/phases/passing.ts",
    "examples/reference-games/hearts/ui/App.tsx",
    "examples/reference-games/hearts/test/scenarios/complete-game.scenario.ts",
  ],
  environment: {
    viewport: "desktop",
    browsers: ["chromium"],
    input: ["mouse", "keyboard"],
  },
  replay: [
    {
      kind: "multi-select",
      interactionId: "submit",
      inputKey: "cardIds",
      cardIds: ["clubs-6", "diamonds-10", "hearts-10"],
      min: 3,
      max: 3,
    },
  ],
} as const;

export default scenario;
