import behaviorScenario from "../scenarios/smoke-initial-hand.scenario.ts";

export const scenario = {
  id: "hearts.pass-three.mobile",
  title: "Hearts: mobile pass-three hand action",
  behaviorScenario,
  contracts: ["Card", "Hand", "InteractionSubmit", "PluginRuntime"],
  capabilities: ["touch", "runtime-submit", "private-hand", "multi-select"],
  sourceFiles: [
    "examples/reference-games/hearts/reference-game.json",
    "examples/reference-games/hearts/rule.md",
    "examples/reference-games/hearts/manifest.ts",
    "examples/reference-games/hearts/app/game.ts",
    "examples/reference-games/hearts/app/phases/passing.ts",
    "examples/reference-games/hearts/ui/App.tsx",
    "examples/reference-games/hearts/ui/interaction-routes.tsx",
    "examples/reference-games/hearts/test/scenarios/smoke-initial-hand.scenario.ts",
    "examples/reference-games/hearts/test/ui-scenarios/pass-three.mobile.scenario.ts",
  ],
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch", "keyboard"],
  },
  replay: [
    {
      kind: "multi-select",
      interactionId: "submit",
      inputKey: "cardIds",
      cardIds: ["clubs-5", "clubs-7", "clubs-K"],
      min: 3,
      max: 3,
    },
  ],
} as const;

export default scenario;
