import { createPrimitiveScenario } from "../scenario-helper.mjs";

export const scenario = createPrimitiveScenario({
  id: "ui-scenarios.boards-slot.desktop",
  title: "Boards: slot targeting",
  contracts: ["SlotSystem", "Panel", "PluginRuntime"],
  sourceFiles: ["examples/ui-scenarios/src/boards/slot-targeting.scenario.mjs"],
  view: {
    family: "boards",
    title: "Boards",
    description: "Slot-based board targets with occupied and available spaces.",
    phase: "target",
  },
});
