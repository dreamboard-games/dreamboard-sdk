import { createReferenceGameRoot } from "../../shared/reference-ui.mjs";

export const Root = createReferenceGameRoot({
  id: "simultaneous-card-drafting",
  scenarioId: "simultaneous-card-drafting.lock-choice.mobile",
  displayName: "Simultaneous Card Drafting",
  interaction: "lock-choice",
  actionLabel: "Lock choice",
  summary: "Lock a private draft choice before reveal.",
});
