export const scenario = {
  id: "hearts.sealed-pass.mobile",
  title: "Hearts: sealed pass in progress",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
  at: "sealed-pass",
  contracts: ["Hand", "Panel", "PluginRuntime"],
  capabilities: ["sealed-commitment", "derived-blocking", "touch"],
  sourceFiles: [
    "examples/reference-games/hearts/rule.md",
    "examples/reference-games/hearts/app/phases/passing.ts",
    "examples/reference-games/hearts/app/player-view.ts",
    "examples/reference-games/hearts/ui/components/game-ui.tsx",
    "examples/reference-games/hearts/test/scenarios/complete-game.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [],
} as const;

export default scenario;
