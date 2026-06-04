import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("GameEndDisplay uses dismissible shadcn dialog content", () => {
  const source = readFileSync(
    join(import.meta.dir, "GameEndDisplay.tsx"),
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
