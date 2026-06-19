import behaviorScenario from "../scenarios/draft-one-pick.scenario.ts";

export const scenario = {
  id: "simultaneous-card-drafting.lock-choice.mobile",
  title: "Simultaneous Card Drafting: mobile locked draft choice",
  behaviorScenario,
  contracts: [
    "CardFace",
    "HandView",
    "InteractionSubmit",
    "Panel",
    "PluginRuntime",
  ],
  capabilities: [
    "touch",
    "runtime-submit",
    "private-hand",
    "locked-choice",
    "hand-passing",
  ],
  sourceFiles: [
    "examples/reference-games/simultaneous-card-drafting/reference-game.json",
    "examples/reference-games/simultaneous-card-drafting/rule.md",
    "examples/reference-games/simultaneous-card-drafting/manifest.ts",
    "examples/reference-games/simultaneous-card-drafting/app/game.ts",
    "examples/reference-games/simultaneous-card-drafting/app/phases/drafting.ts",
    "examples/reference-games/simultaneous-card-drafting/app/rules/scoring.ts",
    "examples/reference-games/simultaneous-card-drafting/ui/App.tsx",
    "examples/reference-games/simultaneous-card-drafting/ui/interaction-routes.tsx",
    "examples/reference-games/simultaneous-card-drafting/test/scenarios/draft-one-pick.scenario.ts",
    "examples/reference-games/simultaneous-card-drafting/test/ui-scenarios/lock-choice.mobile.scenario.ts",
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
      cardIds: ["maki-1-1"],
      min: 1,
      max: 1,
      params: {
        useChopsticks: "no",
        cardIds: ["maki-1-1"],
      },
    },
  ],
} as const;

export default scenario;
