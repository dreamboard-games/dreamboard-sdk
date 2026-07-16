import path from "node:path";

import { root } from "./support.ts";

export const defaultGeneratedWorkbenchRoot = path.join(
  root,
  "build/ui-workbench/generated",
);

export const defaultSmokeScenarioIds = Object.freeze([
  "hearts.dealt-hand.desktop",
  "roll-and-write-scorecard.mark-cell.mobile",
] as const);
