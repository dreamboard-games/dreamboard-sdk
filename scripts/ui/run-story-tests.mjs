#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { root, writeJson } from "./reference-games-lib.mjs";

function run(command, args) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  return {
    command: `${command} ${args.join(" ")}`,
    durationMs: Date.now() - startedAt,
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

async function main() {
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactRoot = path.join(root, "artifacts/ui-stories", runId);
  await mkdir(artifactRoot, { recursive: true });

  const steps = [
    run("pnpm", ["ui:storybook:build"]),
    run("pnpm", ["--filter", "@dreamboard-games/sdk", "storybook:test"]),
  ];
  await writeFile(
    path.join(artifactRoot, "transcript.txt"),
    steps.map((step) => `$ ${step.command}\n${step.output}`).join("\n"),
  );

  const failed = steps.find((step) => step.status !== 0);
  const receipt = {
    schemaVersion: 1,
    kind: "dreamboard-sdk-ui-storybook-interactions",
    checkedAt: new Date().toISOString(),
    result: failed ? "failed" : "passed",
    transcript: path.relative(root, path.join(artifactRoot, "transcript.txt")),
    steps: steps.map(({ command, durationMs, status }) => ({
      command,
      durationMs,
      status,
    })),
  };
  await writeJson(path.join(artifactRoot, "receipt.json"), receipt);
  console.log(`wrote ${path.relative(root, artifactRoot)}/receipt.json`);
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
