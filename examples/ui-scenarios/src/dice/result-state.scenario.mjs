import { createPrimitiveScenario } from "../scenario-helper.mjs";

export const scenario = createPrimitiveScenario({
  id: "ui-scenarios.dice-result.desktop",
  title: "Dice: result state",
  contracts: ["Dialog", "ThemedButton", "Panel", "PluginRuntime"],
  sourceFiles: ["examples/ui-scenarios/src/dice/result-state.scenario.mjs"],
  view: {
    family: "dice",
    title: "Dice",
    description: "Rolled dice result and reroll affordance.",
    phase: "roll",
  },
});
