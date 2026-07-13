import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { replaceDirectoryAtomically } from "./workbench-materialization-guard.mjs";

const helperUrl = pathToFileURL(
  path.resolve("scripts/ui/workbench-materialization-guard.mjs"),
).href;

function runLockWorker({ label, lockPath, tracePath }) {
  const source = `
import { appendFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { withWorkbenchMaterializationLock } from ${JSON.stringify(helperUrl)};
await withWorkbenchMaterializationLock(async () => {
  await appendFile(process.env.TRACE_PATH, JSON.stringify({ label: process.env.LABEL, event: "start" }) + "\\n");
  await delay(100);
  await appendFile(process.env.TRACE_PATH, JSON.stringify({ label: process.env.LABEL, event: "end" }) + "\\n");
}, { lockPath: process.env.LOCK_PATH, pollIntervalMs: 5, timeoutMs: 5_000 });
`;
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--input-type=module", "--eval", source],
      {
        env: {
          ...process.env,
          LABEL: label,
          LOCK_PATH: lockPath,
          TRACE_PATH: tracePath,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`lock worker ${label} exited ${code}: ${stderr}`));
    });
  });
}

test("serializes Workbench materialization across processes", async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "workbench-lock-test-"),
  );
  const lockPath = path.join(tempRoot, "materialize.lock");
  const tracePath = path.join(tempRoot, "trace.jsonl");
  await writeFile(tracePath, "");
  try {
    await Promise.all([
      runLockWorker({ label: "first", lockPath, tracePath }),
      runLockWorker({ label: "second", lockPath, tracePath }),
    ]);
    const events = (await readFile(tracePath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(events.length, 4);
    assert.deepEqual(
      events.map(({ event }) => event),
      ["start", "end", "start", "end"],
    );
    assert.equal(events[0].label, events[1].label);
    assert.equal(events[2].label, events[3].label);
    assert.notEqual(events[0].label, events[2].label);
    assert.equal((await readdir(tempRoot)).includes("materialize.lock"), false);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("publishes a complete generated directory without retaining old files", async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "workbench-publish-test-"),
  );
  const source = path.join(tempRoot, "source");
  const target = path.join(tempRoot, "generated");
  await import("node:fs/promises").then(({ mkdir }) =>
    Promise.all([
      mkdir(path.join(source, "nested"), { recursive: true }),
      mkdir(target, { recursive: true }),
    ]),
  );
  await Promise.all([
    writeFile(path.join(source, "catalog.ts"), "new catalog\n"),
    writeFile(path.join(source, "nested/fixture.json"), "{}\n"),
    writeFile(path.join(target, "obsolete.json"), "{}\n"),
  ]);
  try {
    await replaceDirectoryAtomically(source, target);
    assert.equal(
      await readFile(path.join(target, "catalog.ts"), "utf8"),
      "new catalog\n",
    );
    assert.equal(
      await readFile(path.join(target, "nested/fixture.json"), "utf8"),
      "{}\n",
    );
    assert.equal((await readdir(target)).includes("obsolete.json"), false);
    assert.deepEqual((await readdir(tempRoot)).sort(), ["generated", "source"]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
