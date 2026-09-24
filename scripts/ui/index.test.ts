import assert from "node:assert/strict";
import test from "node:test";
import { runUi, uiHelp, UIUsageError } from "./index.ts";
import type { AsyncCommandRunner } from "../lib/process.ts";

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
  assert.ok(calls[0]!.endsWith(":--dir packages/sdk build"));
  assert.equal(calls[1], "hearts:run test:browser");
});
