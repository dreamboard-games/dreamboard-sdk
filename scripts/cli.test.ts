import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { errorExitCode, parseCli, rootCommands, rootHelp } from "./cli.ts";
import { rootDir } from "./lib/paths.ts";
import { CommandError } from "./lib/process.ts";

function cli(...args: string[]) {
  return spawnSync(process.execPath, ["scripts/cli.ts", ...args], {
    cwd: rootDir,
    encoding: "utf8",
  });
}

test("help documents the product command surface", () => {
  const result = cli("--help");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /generate \[--check\]/);
  assert.match(result.stdout, /reference pin <version>/);
  assert.match(result.stdout, /ui <storybook\|workbench\|test\|snapshots>/);
  assert.equal(rootHelp(), result.stdout);
});

test("recognizes every valid root dispatcher command", () => {
  for (const command of rootCommands) {
    assert.equal(parseCli([command]).command, command);
  }
});

test("unknown commands and options return usage exit code 2", () => {
  const command = cli("missing");
  assert.equal(command.status, 2);
  assert.match(command.stderr, /Unknown command/);

  const option = cli("generate", "--unknown");
  assert.equal(option.status, 2);
  assert.match(option.stderr, /Unknown option/);
});

test("runtime failures return exit code 1", () => {
  const result = cli("reference", "definitely-not-a-reference-game");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown reference game/);
  assert.equal(errorExitCode(new CommandError("child usage failure", 2)), 1);
});
