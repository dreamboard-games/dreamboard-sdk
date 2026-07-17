import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("Guidance components expose controlled player-facing props", () => {
  const source = readFileSync(
    join(import.meta.dirname, "Guidance.tsx"),
    "utf8",
  );

  expect(source).toContain("export interface GuidancePanelProps");
  expect(source).toContain("phase: GuidancePhase");
  expect(source).toContain("actions?: readonly GuidanceAction[]");
  expect(source).toContain("export interface SetupChecklistProps");
  expect(source).toContain("completedStepIds?: readonly string[]");
  expect(source).toContain("export interface ActionHelpProps");
  expect(source).toContain("unavailableReason?: ReactNode");
});

test("Guidance components keep legality and setup completion external", () => {
  const source = readFileSync(
    join(import.meta.dirname, "Guidance.tsx"),
    "utf8",
  );

  expect(source).toContain("const completed = new Set(completedStepIds)");
  expect(source).toContain("completed.has(step.id)");
  expect(source).toContain('role="status"');
  expect(source).toContain("{unavailableReason}");
  expect(source).not.toContain("descriptor.reasons");
  expect(source).not.toContain("ruleId");
  expect(source).not.toContain("errorCode");
});
