#!/usr/bin/env node
// Drift check for the reducer-contract package: generates TypeScript artifacts
// into a temp directory and fails if the result differs from what is currently
// tracked on disk.
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

const TRACKED_GENERATED_DIR = path.join(PKG_ROOT, "generated");
const TRACKED_BUNDLE_PATH = path.join(PKG_ROOT, "src", "bundle.ts");

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: PKG_ROOT,
    stdio: "inherit",
    ...opts,
  });
  if (result.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(" ")} failed with status ${result.status ?? 1}.`,
    );
  }
}

function diffPaths(expectedPath, actualPath) {
  const res = spawnSync(
    "git",
    ["--no-pager", "diff", "--no-index", "--", expectedPath, actualPath],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
    },
  );
  return [res.stdout?.trim() ?? "", res.stderr?.trim() ?? ""]
    .filter(Boolean)
    .join("\n");
}

function pathsMatch(expectedPath, actualPath) {
  const res = spawnSync(
    "git",
    [
      "diff",
      "--no-index",
      "--quiet",
      "--exit-code",
      "--",
      expectedPath,
      actualPath,
    ],
    { cwd: REPO_ROOT },
  );
  return res.status === 0;
}

function comparePath(label, expectedPath, actualPath, drift) {
  if (pathsMatch(expectedPath, actualPath)) return;
  drift.push({
    label,
    diff: diffPaths(expectedPath, actualPath),
  });
}

function compareTrees(expectedPath, actualPath, drift) {
  comparePath(
    path.relative(REPO_ROOT, actualPath),
    expectedPath,
    actualPath,
    drift,
  );
}

function compareFiles(expectedPath, actualPath, drift) {
  comparePath(
    path.relative(REPO_ROOT, actualPath),
    expectedPath,
    actualPath,
    drift,
  );
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

const generatedRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "reducer-contract-generate-check-"),
);
let exitCode = 0;

try {
  run("node", ["scripts/generate-ts.mjs", "--output-root", generatedRoot]);

  const drift = [];
  compareTrees(
    path.join(generatedRoot, "generated"),
    TRACKED_GENERATED_DIR,
    drift,
  );
  compareFiles(
    path.join(generatedRoot, "src", "bundle.ts"),
    TRACKED_BUNDLE_PATH,
    drift,
  );

  if (drift.length > 0) {
    console.error("");
    console.error(
      "✗ reducer-contract generated artifacts are out of sync with schema/reducer-runtime.schema.json.",
    );
    console.error("");
    console.error("Drift detected in:");
    for (const entry of drift) {
      console.error(`  - ${entry.label}`);
    }
    console.error("");
    console.error("Diff:");
    for (const entry of drift) {
      console.error(entry.diff);
    }
    console.error("");
    console.error(
      "Fix: run `pnpm --filter=@dreamboard-games/reducer-contract generate` and commit the regenerated files.",
    );
    exitCode = 1;
  } else {
    // Echo the detected fingerprint so CI logs show *something* happened.
    const trackedFiles = [
      ...collectTrackedFiles(TRACKED_GENERATED_DIR),
      ...collectTrackedFiles(TRACKED_BUNDLE_PATH),
    ];
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
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  exitCode = 1;
} finally {
  fs.rmSync(generatedRoot, { recursive: true, force: true });
}

process.exitCode = exitCode;
