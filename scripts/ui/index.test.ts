import assert from "node:assert/strict";
import test from "node:test";

import {
  runUi,
  selectUiScenarios,
  uiHelp,
  UIUsageError,
  workbenchTestFiles,
} from "./index.ts";

test("default UI tests select the two interaction smoke scenarios", () => {
  assert.deepEqual(selectUiScenarios({ all: false }), [
    "hearts.dealt-hand.desktop",
    "roll-and-write-scorecard.mark-cell.mobile",
  ]);
});

test("focused and all scenario selection are explicit", () => {
  assert.deepEqual(
    selectUiScenarios({ scenario: "hearts.dealt-hand.desktop", all: false }),
    ["hearts.dealt-hand.desktop"],
  );
  assert.deepEqual(selectUiScenarios({ all: true }), []);
});

test("normal UI tests include driver, keyboard, and scenario suites", () => {
  assert.deepEqual(workbenchTestFiles(true), [
    "tests/driver",
    "tests/scenario-keyboard.spec.ts",
    "tests/scenario.spec.ts",
  ]);
  assert.deepEqual(workbenchTestFiles(false), ["tests/scenario.spec.ts"]);
});

test("UI help documents the four product operations", async () => {
  let output = "";
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    output += chunk.toString();
    return true;
  }) as typeof process.stdout.write;
  try {
    await runUi(["--help"]);
  } finally {
    process.stdout.write = originalWrite;
  }
  assert.equal(output, uiHelp());
  assert.match(output, /workbench \[--scenario <id>\] \[--source\]/);
  assert.match(output, /test \[--scenario <id> \| --all\]/);
});

test("UI selectors are mutually exclusive and options are strict", async () => {
  await assert.rejects(
    runUi(["test", "--scenario", "hearts.dealt-hand.desktop", "--all"]),
    (error: unknown) =>
      error instanceof UIUsageError && /mutually exclusive/.test(error.message),
  );
  await assert.rejects(
    runUi(["test", "--unknown"]),
    (error: unknown) => error instanceof UIUsageError,
  );
});
