#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  expectedReferenceGameIds,
  referenceGamesRoot,
  root,
} from "../ui/reference-games-lib.mjs";
import { materializeReferenceGameWorkspaces } from "./materialize-workspace.mjs";
import { withTemporaryReferenceGamePackageLinks } from "./temporary-package-links.mjs";

function run(command, args, { cwd = root, stdio = "inherit" } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: "utf8",
    stdio,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${cwd}${stdio === "pipe" ? `\n${result.stdout ?? ""}${result.stderr ?? ""}` : ""}`,
    );
  }
  return result.stdout?.trim() ?? "";
}

function parseArgs(argv) {
  const gameIds = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--") continue;
    if (argv[index] !== "--game" || !argv[index + 1]) {
      throw new Error(`Unknown or incomplete argument '${argv[index]}'.`);
    }
    gameIds.push(argv[index + 1]);
    index += 1;
  }
  const selected =
    gameIds.length > 0 ? [...new Set(gameIds)] : expectedReferenceGameIds;
  const unknown = selected.filter(
    (id) => !expectedReferenceGameIds.includes(id),
  );
  if (unknown.length > 0)
    throw new Error(`Unknown reference games: ${unknown.join(", ")}.`);
  return selected.sort();
}

function assertRootPinnedCli(gameRoot) {
  const resolved = run("pnpm", ["exec", "which", "dreamboard"], {
    cwd: gameRoot,
    stdio: "pipe",
  });
  const expected = realpathSync(
    path.join(root, "node_modules/.bin/dreamboard"),
  );
  const actual = realpathSync(resolved);
  if (actual !== expected) {
    throw new Error(
      `${path.basename(gameRoot)} resolves dreamboard to ${actual}; expected the SDK root pin ${expected}.`,
    );
  }
}

export async function checkReferenceGames({ gameIds }) {
  run("pnpm", ["reference-games:source:test"]);
  run("pnpm", ["--filter", "@dreamboard-games/sdk", "build"]);
  const gameRoots = gameIds.map((id) => path.join(referenceGamesRoot, id));
  for (const gameRoot of gameRoots) {
    run(
      "pnpm",
      [
        "install",
        "--frozen-lockfile",
        "--ignore-workspace",
        "--config.shared-workspace-lockfile=false",
      ],
      { cwd: gameRoot },
    );
  }

  await withTemporaryReferenceGamePackageLinks({ gameRoots }, async () => {
    await materializeReferenceGameWorkspaces({ gameIds });
    for (const gameRoot of gameRoots) {
      assertRootPinnedCli(gameRoot);
      for (const script of ["typecheck:raw", "test:raw", "test:ui:raw"]) {
        run("pnpm", ["run", script], { cwd: gameRoot });
      }
    }
    run("node", [
      "scripts/ui/check-reference-games.mjs",
      ...gameIds.flatMap((id) => ["--game", id]),
    ]);
  });
}

async function main() {
  const gameIds = parseArgs(process.argv.slice(2));
  await checkReferenceGames({ gameIds });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
