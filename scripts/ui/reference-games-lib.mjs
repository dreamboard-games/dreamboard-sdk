#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  lstat,
  readFile,
  readdir,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "../..");
export const referenceGamesRoot = path.join(root, "examples/reference-games");
export const buildRoot = path.join(root, "build/reference-games");

export const expectedReferenceGames = [
  {
    id: "hearts",
    displayName: "Hearts",
    mechanics: [
      "trick-taking",
      "simultaneous-card-passing",
      "hidden-information",
    ],
    uiPatterns: [
      "private-hand",
      "multi-select",
      "mobile-hand-actions",
      "shared-trick-area",
    ],
  },
  {
    id: "hex-network-trading",
    displayName: "Hex Network Trading",
    mechanics: ["hex-grid", "route-building", "resource-management", "trading"],
    uiPatterns: [
      "hex-board-targets",
      "resource-hand",
      "trade-controls",
      "placement-confirmation",
    ],
  },
  {
    id: "deck-building-market",
    displayName: "Deck Building Market",
    mechanics: [
      "deck-building",
      "market-row",
      "hand-management",
      "repeated-turn-state",
    ],
    uiPatterns: [
      "market-row",
      "purchase-selection",
      "hand-actions",
      "turn-summary",
    ],
  },
  {
    id: "worker-placement-tableau",
    displayName: "Worker Placement Tableau",
    mechanics: [
      "worker-placement",
      "resource-allocation",
      "tableau-building",
      "order-fulfillment",
    ],
    uiPatterns: [
      "worker-targets",
      "tableau-cards",
      "resource-allocation-form",
      "confirmation-dialog",
    ],
  },
  {
    id: "simultaneous-card-drafting",
    displayName: "Simultaneous Card Drafting",
    mechanics: [
      "simultaneous-selection",
      "card-drafting",
      "hand-passing",
      "set-collection",
    ],
    uiPatterns: [
      "private-hand",
      "locked-choice",
      "reveal-pass-transition",
      "compact-mobile-hand",
    ],
  },
];

export const expectedReferenceGameIds = expectedReferenceGames.map(
  (game) => game.id,
);

export const knownMechanics = new Set(
  expectedReferenceGames.flatMap((game) => game.mechanics),
);

export const knownUiPatterns = new Set(
  expectedReferenceGames.flatMap((game) => game.uiPatterns),
);

export const commercialMarkDenylist = [
  "sushi go",
  "sushi-go",
  "catan",
  "settlers of catan",
  "ticket to ride",
];

export function repoCommandEnv(env = process.env) {
  if (
    !existsSync(path.join(root, ".git")) &&
    existsSync(path.join(root, ".here"))
  ) {
    return {
      ...env,
      GIT_DIR: path.join(root, ".here"),
      GIT_WORK_TREE: root,
    };
  }
  return env;
}

export async function pathExists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function writeJson(filePath, value) {
  await writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await import("node:fs/promises").then(({ rename }) =>
    rename(`${filePath}.tmp`, filePath),
  );
}

export async function listReferenceGameDirs() {
  const entries = await readdir(referenceGamesRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export async function walkFiles(dir, { excludeDirs = new Set() } = {}) {
  const files = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(dir, absolute);
      if (entry.isDirectory()) {
        if (!excludeDirs.has(entry.name)) {
          await visit(absolute);
        }
        continue;
      }
      if (entry.isFile()) {
        files.push(relative);
      }
    }
  }
  await visit(dir);
  return files.sort();
}

export async function sha256File(filePath) {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

export async function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

export async function sha256Directory(dir, { excludeDirs = new Set() } = {}) {
  const files = await walkFiles(dir, { excludeDirs });
  const hash = createHash("sha256");
  for (const relative of files) {
    hash.update(relative);
    hash.update("\0");
    hash.update(await readFile(path.join(dir, relative)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function assertNoWorkspaceLink(sandbox, packageName) {
  const dependencyPath = path.join(
    sandbox,
    "node_modules",
    ...packageName.split("/"),
  );
  const linkStat = await lstat(dependencyPath);
  const resolved = await realpath(dependencyPath);
  const rootRealPath = await realpath(root);
  if (
    resolved === rootRealPath ||
    resolved.startsWith(`${rootRealPath}${path.sep}`)
  ) {
    throw new Error(
      `${packageName} resolved into this workspace from ${dependencyPath} -> ${resolved}`,
    );
  }
  return {
    dependencyPath,
    isSymbolicLink: linkStat.isSymbolicLink(),
    resolved,
  };
}
