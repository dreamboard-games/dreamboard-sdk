import { createReferenceGameRoot } from "../../shared/reference-ui.mjs";

export const Root = createReferenceGameRoot({
  id: "worker-placement-tableau",
  scenarioId: "worker-placement-tableau.place-worker.desktop",
  displayName: "Worker Placement Tableau",
  interaction: "place-worker",
  actionLabel: "Place worker",
  summary: "Place a worker on an available tableau action.",
});
