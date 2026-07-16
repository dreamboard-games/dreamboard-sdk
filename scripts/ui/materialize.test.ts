import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  materializeWorkbench,
  publishWorkbenchProduct,
} from "./materialize.ts";

test("the focused Workbench materializer is deterministic", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-ui-determinism-"),
  );
  try {
    const first = await materializeWorkbench({
      outputRoot: path.join(temporaryRoot, "first"),
      gameIds: ["ui-scenarios"],
      lockPath: path.join(temporaryRoot, "materialize.lock"),
    });
    const second = await materializeWorkbench({
      outputRoot: path.join(temporaryRoot, "second"),
      gameIds: ["ui-scenarios"],
      lockPath: path.join(temporaryRoot, "materialize.lock"),
    });
    assert.equal(first.digest, second.digest);
    assert.equal(first.scenarioCount, second.scenarioCount);
    assert.ok(first.scenarioCount > 0);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("a failed rematerialization preserves the last good output", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-ui-last-good-"),
  );
  const outputRoot = path.join(temporaryRoot, "generated");
  try {
    await mkdir(outputRoot, { recursive: true });
    await writeFile(path.join(outputRoot, "catalog.ts"), "last good\n");
    await assert.rejects(
      publishWorkbenchProduct(outputRoot, async (nextRoot) => {
        await writeFile(path.join(nextRoot, "catalog.ts"), "incomplete\n");
        throw new Error("fixture compilation failed");
      }),
      /fixture compilation failed/,
    );
    assert.equal(
      await readFile(path.join(outputRoot, "catalog.ts"), "utf8"),
      "last good\n",
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
