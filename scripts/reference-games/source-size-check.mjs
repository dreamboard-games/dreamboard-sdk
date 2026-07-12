#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compareCanonicalStrings,
  expectedReferenceGameIds,
} from "../ui/reference-games-lib.mjs";
import {
  classifyReferenceGameSourcePath,
  referenceGamePathIdentity,
} from "./source-inventory-policy.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const referenceGamesPrefix = "examples/reference-games/";
const trackedTextLimit = 75_000;
const retainedLockLimit = 15_000;
const expectedLockCount = 9;

const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonl",
  ".md",
  ".yaml",
  ".yml",
  ".toml",
  ".css",
  ".html",
  ".svg",
  ".txt",
]);
const textBasenames = new Set([".gitignore"]);
const binaryExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".mp4",
  ".webm",
  ".zip",
  ".gz",
]);
function usage() {
  return `
Usage: pnpm reference-games:source-size:check [--audit] [--json]

Read the Git index and enforce the reference-game authored-source budget.
Audit mode reports every future strict violation but exits successfully while
the coordinated derived-output deletion is still pending.
`.trim();
}

function parseArgs(argv) {
  const options = { audit: false, json: false };
  for (const arg of argv) {
    if (arg === "--audit") {
      options.audit = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument '${arg}'.\n\n${usage()}`);
    }
  }
  return options;
}

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed:\n${result.stderr?.toString("utf8") ?? ""}`,
    );
  }
  return result.stdout;
}

function readIndexEntries(pathspecs) {
  const raw = runGit(["ls-files", "-s", "-z", "--", ...pathspecs]);
  return raw
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const match = /^(\d+) ([0-9a-f]+) (\d+)\t(.+)$/s.exec(record);
      if (!match) {
        throw new Error(
          `Could not parse Git index record ${JSON.stringify(record)}.`,
        );
      }
      const [, mode, oid, stage, filePath] = match;
      if (stage !== "0") {
        throw new Error(
          `Unmerged Git index entry is not measurable: ${filePath}.`,
        );
      }
      return { mode, oid, path: filePath };
    })
    .sort((left, right) => compareCanonicalStrings(left.path, right.path));
}

function readBlobs(entries) {
  const oids = [...new Set(entries.map(({ oid }) => oid))];
  const output = runGit(["cat-file", "--batch"], {
    input: `${oids.join("\n")}\n`,
  });
  const blobs = new Map();
  let offset = 0;
  for (const expectedOid of oids) {
    const headerEnd = output.indexOf(0x0a, offset);
    if (headerEnd < 0) {
      throw new Error(`Missing git cat-file header for ${expectedOid}.`);
    }
    const header = output.subarray(offset, headerEnd).toString("utf8");
    const [actualOid, type, sizeText] = header.split(" ");
    const size = Number(sizeText);
    if (
      actualOid !== expectedOid ||
      type !== "blob" ||
      !Number.isSafeInteger(size) ||
      size < 0
    ) {
      throw new Error(`Unexpected git cat-file header '${header}'.`);
    }
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;
    if (contentEnd >= output.length || output[contentEnd] !== 0x0a) {
      throw new Error(`Truncated git cat-file blob ${expectedOid}.`);
    }
    blobs.set(expectedOid, output.subarray(contentStart, contentEnd));
    offset = contentEnd + 1;
  }
  if (offset !== output.length) {
    throw new Error("git cat-file returned unexpected trailing bytes.");
  }
  return blobs;
}

export function logicalLineCount(content) {
  let lines = 0;
  for (const byte of content) {
    if (byte === 0x0a) lines += 1;
  }
  if (content.length > 0 && content[content.length - 1] !== 0x0a) {
    lines += 1;
  }
  return lines;
}

function textOrBinary(filePath) {
  const basename = path.posix.basename(filePath);
  if (textBasenames.has(basename)) return "text";
  const extension = path.posix.extname(filePath).toLowerCase();
  if (textExtensions.has(extension)) return "text";
  if (binaryExtensions.has(extension)) return "binary";
  return "unclassified";
}

export function classifyReferenceGamePath(filePath) {
  const identity = referenceGamePathIdentity(filePath);
  if (!identity) return null;
  const { gameId, relativePath } = identity;
  if (relativePath === "pnpm-lock.yaml") {
    return { className: "retained-lock", gameId, relativePath, kind: "text" };
  }
  const sourceClass = classifyReferenceGameSourcePath(filePath);
  if (sourceClass !== "included") {
    return {
      className: sourceClass,
      gameId,
      relativePath,
      kind: textOrBinary(filePath),
    };
  }
  return {
    className: "authored",
    gameId,
    relativePath,
    kind: textOrBinary(filePath),
  };
}

function emptyClassSummary() {
  return { paths: 0, textLines: 0, bytes: 0 };
}

function collectReceipt() {
  const gameRoots = expectedReferenceGameIds.map(
    (gameId) => `${referenceGamesPrefix}${gameId}`,
  );
  const gameEntries = readIndexEntries(gameRoots);
  const workbenchEntries = readIndexEntries([
    "fixtures/ui/reference-games",
    "packages/ui-workbench/src/catalog.ts",
  ]);
  const blobs = readBlobs([...gameEntries, ...workbenchEntries]);
  const classes = Object.fromEntries(
    [
      "authored",
      "retained-lock",
      "workspace-generated",
      "test-generated",
      "test-base",
      "obsolete-screenshot",
      "derived-output",
      "binary-assets",
      "unclassified",
    ].map((className) => [className, emptyClassSummary()]),
  );
  const forbiddenPaths = [];
  const unclassifiedPaths = [];
  const lockPaths = [];
  let trackedTextLines = 0;
  let trackedBytes = 0;
  const inventory = [];

  for (const entry of gameEntries) {
    const classification = classifyReferenceGamePath(entry.path);
    if (!classification) {
      throw new Error(
        `Unexpected path outside the nine game roots: ${entry.path}.`,
      );
    }
    const content = blobs.get(entry.oid);
    if (!content) throw new Error(`Missing Git blob ${entry.oid}.`);
    const kind = classification.kind;
    const textLines = kind === "text" ? logicalLineCount(content) : 0;
    const bucketName =
      kind === "unclassified"
        ? "unclassified"
        : kind === "binary" && classification.className === "authored"
          ? "binary-assets"
          : classification.className;
    const bucket = classes[bucketName];
    bucket.paths += 1;
    bucket.textLines += textLines;
    bucket.bytes += content.length;
    trackedTextLines += textLines;
    trackedBytes += content.length;
    if (
      [
        "workspace-generated",
        "test-generated",
        "test-base",
        "obsolete-screenshot",
        "derived-output",
      ].includes(classification.className)
    ) {
      forbiddenPaths.push(entry.path);
    }
    if (classification.className === "retained-lock") {
      lockPaths.push(entry.path);
    }
    if (kind === "unclassified") {
      unclassifiedPaths.push(entry.path);
    }
    inventory.push({
      path: entry.path,
      oid: entry.oid,
      bytes: content.length,
      textLines,
      className: classification.className,
      kind,
    });
  }

  for (const entry of workbenchEntries) {
    forbiddenPaths.push(entry.path);
  }

  const missingLocks = expectedReferenceGameIds
    .map((gameId) => `${referenceGamesPrefix}${gameId}/pnpm-lock.yaml`)
    .filter((lockPath) => !lockPaths.includes(lockPath));
  const violations = [];
  if (forbiddenPaths.length > 0) {
    violations.push({
      code: "TRACKED_DERIVED_PATHS",
      message: `${forbiddenPaths.length} forbidden generated/base/Workbench/screenshot paths are tracked`,
    });
  }
  if (unclassifiedPaths.length > 0) {
    violations.push({
      code: "UNCLASSIFIED_PATHS",
      message: `${unclassifiedPaths.length} reference-game paths have an unclassified extension or basename`,
    });
  }
  if (lockPaths.length !== expectedLockCount || missingLocks.length > 0) {
    violations.push({
      code: "LOCKFILE_COUNT",
      message: `expected exactly ${expectedLockCount} per-game lockfiles, found ${lockPaths.length}`,
    });
  }
  if (classes["retained-lock"].textLines > retainedLockLimit) {
    violations.push({
      code: "LOCKFILE_LINE_LIMIT",
      message: `retained lockfiles use ${classes["retained-lock"].textLines} lines, limit ${retainedLockLimit}`,
    });
  }
  if (trackedTextLines > trackedTextLimit) {
    violations.push({
      code: "TRACKED_TEXT_LINE_LIMIT",
      message: `reference-game roots use ${trackedTextLines} text lines, limit ${trackedTextLimit}`,
    });
  }

  const inventoryDigest = `sha256:${createHash("sha256")
    .update(`${JSON.stringify(inventory)}\n`)
    .digest("hex")}`;
  return {
    schemaVersion: 1,
    source: "git-index",
    limits: {
      trackedTextLines: trackedTextLimit,
      retainedLockLines: retainedLockLimit,
      retainedLockCount: expectedLockCount,
    },
    summary: {
      gameCount: expectedReferenceGameIds.length,
      trackedPaths: gameEntries.length,
      trackedTextLines,
      trackedBytes,
      inventoryDigest,
    },
    classes,
    locks: {
      paths: lockPaths,
      missing: missingLocks,
    },
    forbiddenPaths,
    unclassifiedPaths,
    violations,
  };
}

function printHuman(receipt, audit) {
  const mode = audit ? "audit" : "strict";
  process.stdout.write(
    `Reference-game source-size ${mode}: ${receipt.summary.trackedPaths} paths, ` +
      `${receipt.summary.trackedTextLines} text lines, ${receipt.summary.trackedBytes} bytes.\n`,
  );
  for (const [className, value] of Object.entries(receipt.classes)) {
    if (value.paths === 0) continue;
    process.stdout.write(
      `  ${className}: ${value.paths} paths, ${value.textLines} text lines, ${value.bytes} bytes\n`,
    );
  }
  process.stdout.write(`  inventory: ${receipt.summary.inventoryDigest}\n`);
  if (receipt.violations.length === 0) {
    process.stdout.write("Source-size policy passes.\n");
    return;
  }
  process.stdout.write(
    `${audit ? "Audit found" : "Source-size policy failed with"} ${receipt.violations.length} violation(s):\n`,
  );
  for (const violation of receipt.violations) {
    process.stdout.write(`  ${violation.code}: ${violation.message}\n`);
  }
  if (receipt.forbiddenPaths.length > 0) {
    process.stdout.write("  forbidden paths:\n");
    for (const filePath of receipt.forbiddenPaths) {
      process.stdout.write(`    ${filePath}\n`);
    }
  }
  if (receipt.unclassifiedPaths.length > 0) {
    process.stdout.write("  unclassified paths:\n");
    for (const filePath of receipt.unclassifiedPaths) {
      process.stdout.write(`    ${filePath}\n`);
    }
  }
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const receipt = collectReceipt();
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify({ ...receipt, audit: options.audit })}\n`,
    );
  } else {
    printHuman(receipt, options.audit);
  }
  if (!options.audit && receipt.violations.length > 0) {
    process.exitCode = 1;
  }
  return receipt;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
