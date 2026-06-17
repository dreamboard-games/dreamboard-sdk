import { createReferenceGameRoot } from "../../shared/reference-ui.mjs";

export const Root = createReferenceGameRoot({
  id: "hearts",
  scenarioId: "hearts.pass-three.mobile",
  displayName: "Hearts",
  interaction: "pass-three",
  actionLabel: "Pass three cards",
  summary: "Select and pass three private cards.",
});
