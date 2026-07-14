import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("GameEventLog exposes controlled event presentation props", () => {
  const source = readFileSync(
    join(import.meta.dir, "GameEventLog.tsx"),
    "utf8",
  );

  expect(source).toContain("export interface GameEventLogProps");
  expect(source).toContain("events: readonly ProjectedGameEvent[]");
  expect(source).toContain("empty?: ReactNode");
  expect(source).toContain("maxVisible?: number");
  expect(source).toContain("export interface SystemActionSummaryProps");
  expect(source).toContain("event: SystemActionEvent");
});

test("GameEventLog renders passive system events without gameplay commands", () => {
  const source = readFileSync(
    join(import.meta.dir, "GameEventLog.tsx"),
    "utf8",
  );

  expect(source).toContain('aria-live="polite"');
  expect(source).toContain("event.version");
  expect(source).toContain("event.index");
  expect(source).toContain("formatDetailValue");
  expect(source).not.toContain("submit");
  expect(source).not.toContain("onClick");
  expect(source).not.toContain("retry");
});
