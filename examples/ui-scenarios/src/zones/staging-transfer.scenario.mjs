import { createPrimitiveScenario } from "../scenario-helper.mjs";

export const scenario = createPrimitiveScenario({
  id: "ui-scenarios.zones-staging.desktop",
  title: "Zones and collections: staging transfer",
  contracts: ["StagingZone", "SlotSystem", "Panel", "PluginRuntime"],
  sourceFiles: [
    "examples/ui-scenarios/src/zones/staging-transfer.scenario.mjs",
  ],
  view: {
    family: "zones",
    title: "Zones and collections",
    description: "A staged transfer between list, pile, and staging zones.",
    phase: "stage",
  },
});
