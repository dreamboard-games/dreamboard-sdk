import { createReferenceGameRoot } from "../../shared/reference-ui.mjs";

export const Root = createReferenceGameRoot({
  id: "worker-placement-tableau",
  scenarioId: "worker-placement-tableau.place-worker.desktop",
  displayName: "Worker Placement Tableau",
  interaction: "place-worker",
  actionLabel: "Place worker",
  summary: "Place a worker on an available tableau action.",
  interactionMode: "draft",
  draftInput: {
    key: "workerCount",
    label: "Workers to place",
    min: 1,
    max: 3,
  },
  resources: [
    { type: "wood", label: "Wood", icon: "W", count: 3 },
    { type: "cloth", label: "Cloth", icon: "C", count: 2 },
  ],
  slots: [
    {
      id: "kiln",
      name: "Kiln",
      description: "Convert wood into fired goods.",
      capacity: 1,
    },
    {
      id: "loom",
      name: "Loom",
      description: "Turn cloth into an order.",
      capacity: 1,
    },
    {
      id: "workbench",
      name: "Workbench",
      description: "Build a tableau upgrade.",
      capacity: 1,
    },
  ],
});
