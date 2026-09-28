import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { runUi, uiHelp, UIUsageError } from "./index.ts";
import { CommandError } from "../lib/process.ts";
import type {
  AsyncCommandRunner,
  CommandStarter,
  RunningCommand,
} from "../lib/process.ts";

test("UI help describes real authored game and registry entry points", () => {
  assert.match(uiHelp(), /dev --game/);
  assert.match(uiHelp(), /at=<checkpoint>/);
  assert.doesNotMatch(uiHelp(), /workbench|snapshots|tape/);
});
test("obsolete selectors and unknown commands fail before launching anything", async () => {
  for (const args of [
    ["test", "--scenario", "old.tape"],
    ["test", "--all"],
    ["dev"],
    ["workbench"],
  ]) {
    await assert.rejects(
      runUi(args, async () => {
        assert.fail("Unexpected process");
      }),
      UIUsageError,
    );
  }
});
test("focused browser verification builds the SDK and executes the selected real game", async () => {
  const calls: string[] = [];
  const run: AsyncCommandRunner = async (_command, args, options) => {
    calls.push(`${options?.cwd?.split("/").at(-1)}:${args.join(" ")}`);
    return "";
  };
  await runUi(["test", "--game", "hearts"], run);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].endsWith(":--dir packages/sdk build"));
  assert.equal(calls[1], "hearts:run test:browser");
});

function liveCommands() {
  const calls: string[] = [];
  const run: AsyncCommandRunner = async (_command, args) => {
    calls.push(`build:${args.join(" ")}`);
    return "";
  };
  const children: Array<{
    args: readonly string[];
    resolve(): void;
    reject(error: Error): void;
    stopped: NodeJS.Signals[];
  }> = [];
  const start: CommandStarter = (_command, args) => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const completed = new Promise<void>((ok, fail) => {
      resolve = ok;
      reject = fail;
    });
    const child = { args, resolve, reject, stopped: [] as NodeJS.Signals[] };
    children.push(child);
    return {
      completed,
      stop(signal: NodeJS.Signals = "SIGTERM") {
        child.stopped.push(signal);
        reject(new CommandError(`stopped by ${signal}`));
      },
    } satisfies RunningCommand;
  };
  return { calls, run, children, start, signals: new EventEmitter() };
}

test("initial SDK build failure does not start live children", async () => {
  const live = liveCommands();
  await assert.rejects(
    runUi(
      ["storybook"],
      async () => {
        throw new CommandError("build failed");
      },
      live.start,
      live.signals,
    ),
    /build failed/,
  );
  assert.equal(live.children.length, 0);
});

test("storybook starts SDK watch and server after initial build, then stops server on watch failure", async () => {
  const live = liveCommands();
  const operation = runUi(["storybook"], live.run, live.start, live.signals);
  await new Promise(setImmediate);
  assert.deepEqual(live.calls, ["build:--dir packages/sdk build"]);
  assert.deepEqual(
    live.children.map(({ args }) => args.join(" ")),
    ["--dir packages/sdk exec tsup --watch", "--dir registry storybook"],
  );
  live.children[0].reject(new CommandError("watch failed"));
  await assert.rejects(operation, /watch failed/);
  assert.deepEqual(live.children[1].stopped, ["SIGTERM"]);
  assert.equal(live.signals.listenerCount("SIGINT"), 0);
  assert.equal(live.signals.listenerCount("SIGTERM"), 0);
});

test("live server exit stops the SDK watcher and reports the unexpected exit", async () => {
  const live = liveCommands();
  const operation = runUi(["storybook"], live.run, live.start, live.signals);
  await new Promise(setImmediate);
  live.children[1].resolve();
  await assert.rejects(operation, /exited unexpectedly/);
  assert.deepEqual(live.children[0].stopped, ["SIGTERM"]);
});

test("SIGINT reaches both live children and removes signal listeners", async () => {
  const live = liveCommands();
  const operation = runUi(["storybook"], live.run, live.start, live.signals);
  await new Promise(setImmediate);
  live.signals.emit("SIGINT");
  await operation;
  assert.deepEqual(
    live.children.map(({ stopped }) => stopped),
    [["SIGINT"], ["SIGINT"]],
  );
  assert.equal(live.signals.listenerCount("SIGINT"), 0);
  assert.equal(live.signals.listenerCount("SIGTERM"), 0);
});
