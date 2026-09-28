import assert from "node:assert/strict";
import test from "node:test";
import { inspectTypeBoundaries } from "./type-audit.ts";

test("inventory includes multiline assertions, all unknowns and angle-bracket assertions", () => {
  const entries = inspectTypeBoundaries(
    "fixture.ts",
    `type Value = unknown;\nconst a = raw as unknown as Box<Value>;\nconst b = <any>raw;\nconst c = optional!;`,
  );
  assert.deepEqual(
    entries.map(({ kind }) => kind),
    [
      "unknown",
      "assertion",
      "assertion",
      "unknown",
      "assertion",
      "any",
      "non-null",
    ],
  );
  assert.equal(entries[1]?.line, 2);
});

test("inventory includes definite-assignment boundaries in variables and class fields", () => {
  const entries = inspectTypeBoundaries(
    "fixture.ts",
    "let resolve!: () => void;\nclass Session { game!: string; }",
  );
  assert.deepEqual(
    entries.map(({ kind, line, syntax }) => ({ kind, line, syntax })),
    [
      { kind: "definite-assignment", line: 1, syntax: "resolve!: () => void" },
      { kind: "definite-assignment", line: 2, syntax: "game!: string;" },
    ],
  );
});
