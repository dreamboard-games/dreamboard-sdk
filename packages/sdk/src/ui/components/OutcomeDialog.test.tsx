import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("OutcomeDialog uses dismissible shadcn dialog content", () => {
  const source = readFileSync(
    join(import.meta.dirname, "OutcomeDialog.tsx"),
    "utf8",
  );

  expect(source).toContain("../internal/ui/dialog.js");
  expect(source).toContain("<Dialog open={isOpen} onOpenChange={setIsOpen}>");
  expect(source).toContain("<DialogContent");
  expect(source).toContain(
    '<DialogTitle className="sr-only">{title}</DialogTitle>',
  );
  expect(source).toContain('aria-hidden="true"');
  expect(source).not.toContain("showCloseButton={false}");
});

test("OutcomeDialog exposes controlled outcome presentation", () => {
  const source = readFileSync(
    join(import.meta.dirname, "OutcomeDialog.tsx"),
    "utf8",
  );

  expect(source).toContain("outcome?: GameOutcome<PlayerId> | null");
  expect(source).toContain("rows: readonly OutcomeStanding<PlayerId>[]");
  expect(source).toContain("playerName: (playerId: PlayerId) => ReactNode");
});
