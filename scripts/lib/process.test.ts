import assert from "node:assert/strict";
import test from "node:test";

import { CommandError, runAsync } from "./process.ts";

test("runAsync returns captured stdout", async () => {
  const output = await runAsync(
    process.execPath,
    ["--eval", 'process.stdout.write("captured output")'],
    { capture: true },
  );
  assert.equal(output, "captured output");
});

test("runAsync reports captured stderr and the child exit code", async () => {
  await assert.rejects(
    runAsync(
      process.execPath,
      [
        "--eval",
        'process.stderr.write("expected failure"); process.exitCode = 1',
      ],
      { capture: true },
    ),
    (error: unknown) => {
      assert.ok(error instanceof CommandError);
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /expected failure/);
      return true;
    },
  );
});
