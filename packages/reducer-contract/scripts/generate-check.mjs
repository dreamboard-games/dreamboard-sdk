#!/usr/bin/env node
// Drift check for the reducer-contract package: regenerates TypeScript
// artifacts from schema/reducer-runtime.schema.json and fails if the result
// differs from what is currently on disk.
//
// This catches the "I edited the schema but forgot to regenerate" class of
// drift at pnpm fin / CI time, before the wire contract can diverge silently.
//
// If you intentionally changed schema and regenerated locally, the files on
// disk will already match and this check passes.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(PKG_ROOT, "..", "..");

const TRACKED_OUTPUT_PATHS = [
  path.join(PKG_ROOT, "generated"),
  path.join(PKG_ROOT, "src", "bundle.ts"),
  path.join(REPO_ROOT, "packages", "sdk", "src", "generated", "reducer-contract"),
  path.join(
    REPO_ROOT,
    "packages",
    "sdk",
    "src",
    "infrastructure",
    "reducer-contract",
    "bundle.ts",
  ),
];

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: PKG_ROOT,
    stdio: "inherit",
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function captureDiff(relativePath) {
  const beforePath = path.join(snapshotRoot, relativePath);
  const afterPath = path.join(REPO_ROOT, relativePath);
  const res = spawnSync(
    "git",
    ["--no-pager", "diff", "--no-index", "--", beforePath, afterPath],
    {
      cwd: snapshotRoot,
      encoding: "utf8",
    },
  );
  return [res.stdout?.trim() ?? "", res.stderr?.trim() ?? ""]
    .filter(Boolean)
    .join("\n");
}

function isClean(relativePath) {
  const beforePath = path.join(snapshotRoot, relativePath);
  const afterPath = path.join(REPO_ROOT, relativePath);
  const res = spawnSync(
    "git",
    [
      "diff",
      "--no-index",
      "--quiet",
      "--exit-code",
      "--",
      beforePath,
      afterPath,
    ],
    { cwd: snapshotRoot },
  );
  return res.status === 0;
}

function snapshotTrackedOutputs() {
  for (const outputPath of TRACKED_OUTPUT_PATHS) {
    if (!fs.existsSync(outputPath)) continue;
    const rel = path.relative(REPO_ROOT, outputPath);
    const destination = path.join(snapshotRoot, rel);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(outputPath, destination, { recursive: true });
  }
}

function collectTrackedFiles(outputPath) {
  if (!fs.existsSync(outputPath)) return [];
  if (fs.statSync(outputPath).isFile()) {
    return [path.relative(REPO_ROOT, outputPath)];
  }
  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        files.push(path.relative(REPO_ROOT, absolute));
      }
    }
  };
  visit(outputPath);
  return files.sort();
}

const snapshotRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "reducer-contract-generate-check-"),
);

try {
  snapshotTrackedOutputs();

  // Regenerate the TypeScript SDK-side reducer contract.
  run("node", ["scripts/generate-ts.mjs"]);

  const drift = [];
  for (const outputPath of TRACKED_OUTPUT_PATHS) {
    const rel = path.relative(REPO_ROOT, outputPath);
    const existedBefore = fs.existsSync(path.join(snapshotRoot, rel));
    const existsAfter = fs.existsSync(outputPath);
    if (!existedBefore && !existsAfter) continue;
    if (!isClean(rel)) {
      drift.push(rel);
    }
  }

  if (drift.length > 0) {
    console.error("");
    console.error(
      "✗ reducer-contract generated artifacts are out of sync with schema/reducer-runtime.schema.json.",
    );
    console.error("");
    console.error("Drift detected in:");
    for (const rel of drift) {
      console.error(`  - ${rel}`);
    }
    console.error("");
    console.error("Diff:");
    for (const rel of drift) {
      console.error(captureDiff(rel));
    }
    console.error("");
    console.error(
      "Fix: run `pnpm --filter=@dreamboard-games/reducer-contract generate` and commit the regenerated files.",
    );
    process.exit(1);
  }

  // Echo the detected fingerprint so CI logs show *something* happened.
  const trackedFiles = TRACKED_OUTPUT_PATHS.flatMap(collectTrackedFiles);
  const hash = trackedFiles.length
    ? spawnSync("git", ["hash-object", ...trackedFiles], {
        cwd: REPO_ROOT,
        encoding: "utf8",
      })
    : null;
  const sha = hash?.status === 0 ? hash.stdout.trim().split("\n")[0] : "";
  if (sha) {
    console.log(
      `✓ reducer-contract generated artifacts are clean (first-file sha: ${sha}).`,
    );
  } else {
    console.log("✓ reducer-contract generated artifacts are clean.");
  }
} finally {
  fs.rmSync(snapshotRoot, { recursive: true, force: true });
}
