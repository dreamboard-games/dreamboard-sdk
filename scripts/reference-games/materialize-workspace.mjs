#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";

import { materializeWorkspace } from "../../packages/sdk/dist/authoring-compiler.js";
import {
  expectedReferenceGameIds,
  referenceGamesRoot,
} from "../ui/reference-games-lib.mjs";

export async function materializeReferenceGameWorkspaces({ gameIds } = {}) {
  const selected = normalizeGameIds(gameIds);
  const games = [];
  for (const gameId of selected) {
    const projectRoot = path.join(referenceGamesRoot, gameId);
    const receipt = await materializeWorkspace({
      projectRoot,
      manifestPath: "manifest.ts",
    });
    games.push({
      id: gameId,
      authoritativeFiles: receipt.authoritativeFiles,
      seededFiles: receipt.seededFiles,
      artifacts: receipt.artifacts,
      digest: receipt.digest,
    });
  }
  return { schemaVersion: 1, games };
}

function normalizeGameIds(gameIds) {
  const selected = gameIds?.length
    ? [...new Set(gameIds)]
    : [...expectedReferenceGameIds];
  const unknown = selected.filter(
    (gameId) => !expectedReferenceGameIds.includes(gameId),
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown reference games: ${unknown.join(", ")}.`);
  }
  return selected.sort();
}

function parseArgs(argv) {
  const gameIds = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--game") {
      gameIds.push(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument '${argv[index]}'.`);
  }
  return { gameIds };
}

async function main() {
  const result = await materializeReferenceGameWorkspaces(
    parseArgs(process.argv.slice(2)),
  );
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
