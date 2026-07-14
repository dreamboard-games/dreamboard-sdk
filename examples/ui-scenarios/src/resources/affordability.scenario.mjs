import { createPrimitiveScenario } from "../scenario-helper.mjs";

export const scenario = createPrimitiveScenario({
  id: "ui-scenarios.resources-cost.desktop",
  title: "Resources and costs: affordability",
  contracts: ["CostDisplay", "ResourceCounter", "Panel", "PluginRuntime"],
  sourceFiles: [
    "examples/ui-scenarios/src/resources/affordability.scenario.mjs",
  ],
  view: {
    family: "resources",
    title: "Resources and costs",
    description: "Current resources and a payable cost.",
    phase: "pay",
  },
});
