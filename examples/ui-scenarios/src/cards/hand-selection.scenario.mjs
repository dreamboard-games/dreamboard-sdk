import { createPrimitiveScenario } from "../scenario-helper.mjs";

export const scenario = createPrimitiveScenario({
  id: "ui-scenarios.cards-hand.desktop",
  title: "Cards and hands: selection and hidden state",
  contracts: ["CardFace", "HandView", "StagingZone", "Panel", "PluginRuntime"],
  sourceFiles: ["examples/ui-scenarios/src/cards/hand-selection.scenario.mjs"],
  view: {
    family: "cards",
    title: "Cards and hands",
    description: "Selectable cards, disabled affordances, and hidden state.",
    phase: "select",
  },
});
