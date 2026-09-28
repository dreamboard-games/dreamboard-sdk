import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { CommandError, runAsync, startCommand } from "./process.ts";

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

test("startCommand reports a live child startup failure", async () => {
  const child = startCommand(process.execPath, ["--eval", "process.exit(7)"]);
  await assert.rejects(child.completed, (error: unknown) => {
    assert.ok(error instanceof CommandError);
    assert.equal(error.exitCode, 7);
    return true;
  });
});

test(
  "stop reaches a descendant even after its command wrapper exits",
  { skip: process.platform === "win32" },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "sdk-ui-process-"));
    const pidFile = path.join(directory, "pid");
    const stoppedFile = path.join(directory, "stopped");
    const grandchild = `const fs=require("node:fs");process.on("SIGTERM",()=>{fs.writeFileSync(process.argv[1],"stopped");process.exit(0)});process.stdout.write("ready");setInterval(()=>{},1000)`;
    const wrapper = `const {spawn}=require("node:child_process");const fs=require("node:fs");const child=spawn(process.execPath,["-e",${JSON.stringify(grandchild)},process.argv[1]],{stdio:["ignore","pipe","inherit"]});child.stdout.once("data",()=>{fs.writeFileSync(process.argv[2],String(child.pid));process.exit(0)})`;
    let descendantPid: number | undefined;
    try {
      const command = startCommand(process.execPath, [
        "--eval",
        wrapper,
        stoppedFile,
        pidFile,
      ]);
      await command.completed;
      descendantPid = Number(await readFile(pidFile, "utf8"));
      command.stop();
      let stopped = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        try {
          stopped = (await readFile(stoppedFile, "utf8")) === "stopped";
          break;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }
      assert.equal(stopped, true);
    } finally {
      if (descendantPid) {
        try {
          process.kill(descendantPid, "SIGKILL");
        } catch {
          // The descendant normally exited after SIGTERM.
        }
      }
      await rm(directory, { recursive: true, force: true });
    }
  },
);
