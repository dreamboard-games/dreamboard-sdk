#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.resolve(
  process.env.AUTHORING_CANDIDATE_DIR ??
    path.join(root, "build", "authoring-candidates"),
);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return (result.stdout ?? "").trim();
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
run("pnpm", ["turbo", "run", "build", "--filter=@dreamboard-games/sdk..."], {
  stdio: "inherit",
});
run("node", ["scripts/pack-and-smoke-sdk.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    AUTHORING_CANDIDATE_DIR: outputDir,
  },
});

const receiptPath = path.join(
  outputDir,
  "sdk-authoring-candidate-receipt.json",
);
const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
receipt.source = {
  revision: run("git", [
    "-c",
    "core.fsmonitor=false",
    "--git-dir=.here",
    "--work-tree=.",
    "rev-parse",
    "HEAD",
  ]),
  dirty:
    run("git", [
      "-c",
      "core.fsmonitor=false",
      "--git-dir=.here",
      "--work-tree=.",
      "status",
      "--short",
      "--untracked-files=no",
    ]).length > 0,
};
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Retained SDK authoring candidate in ${outputDir}`);
