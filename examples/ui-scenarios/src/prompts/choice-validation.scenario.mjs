import { createPrimitiveScenario } from "../scenario-helper.mjs";

export const scenario = createPrimitiveScenario({
  id: "ui-scenarios.prompts-choice.desktop",
  title: "Prompts: choice validation",
  contracts: [
    "ActionPanel",
    "Input",
    "PrimaryActionButton",
    "Panel",
    "PluginRuntime",
  ],
  sourceFiles: [
    "examples/ui-scenarios/src/prompts/choice-validation.scenario.mjs",
  ],
  view: {
    family: "prompts",
    title: "Prompts",
    description: "Choice validation and submit affordances.",
    phase: "prompt",
  },
});
