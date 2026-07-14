import assert from "node:assert/strict";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { materializeReferenceGameWorkspaces } from "../reference-games/materialize-workspace.mjs";
import { referenceGamesRoot } from "./reference-games-lib.mjs";

test("materializes after a root-only install and restores prior package links", async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "reference-game-link-bootstrap-"),
  );
  const gamesRoot = path.join(tempRoot, "reference-games");
  const gameRoot = path.join(gamesRoot, "hearts");
  const sdkLink = path.join(gameRoot, "node_modules/@dreamboard-games/sdk");
  const zodLink = path.join(gameRoot, "node_modules/zod");
  try {
    await mkdir(gameRoot, { recursive: true });
    const heartsManifest = await readFile(
      path.join(referenceGamesRoot, "hearts/manifest.ts"),
      "utf8",
    );
    const manifestWithRuntimeDependency = heartsManifest
      .replace(
        'import { defineTopologyManifest } from "@dreamboard-games/sdk/types";',
        'import { defineTopologyManifest } from "@dreamboard-games/sdk/types";\nimport { z } from "zod";',
      )
      .replace("minPlayers: 4,", "minPlayers: z.literal(4).value,");
    assert.notEqual(manifestWithRuntimeDependency, heartsManifest);
    await writeFile(
      path.join(gameRoot, "manifest.ts"),
      manifestWithRuntimeDependency,
    );

    await assertMissing(sdkLink);
    await assertMissing(zodLink);
    const first = await materializeReferenceGameWorkspaces({
      gameIds: ["hearts"],
      gamesRoot,
    });
    assert.equal(first.games.length, 1);
    assert.equal(first.games[0].id, "hearts");
    assert.ok(first.games[0].authoritativeFiles > 0);
    await assertMissing(sdkLink);
    await assertMissing(zodLink);

    const priorSdkTarget = path.join(tempRoot, "prior-sdk");
    const priorZodTarget = path.join(tempRoot, "prior-zod");
    await Promise.all([
      mkdir(priorSdkTarget),
      mkdir(priorZodTarget),
      mkdir(path.dirname(sdkLink), { recursive: true }),
    ]);
    await Promise.all([
      symlink(priorSdkTarget, sdkLink, "dir"),
      symlink(priorZodTarget, zodLink, "dir"),
    ]);

    const second = await materializeReferenceGameWorkspaces({
      gameIds: ["hearts"],
      gamesRoot,
    });
    assert.equal(second.games[0].digest, first.games[0].digest);
    assert.equal(await readlink(sdkLink), priorSdkTarget);
    assert.equal(await readlink(zodLink), priorZodTarget);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

async function assertMissing(filePath) {
  await assert.rejects(lstat(filePath), (error) => error?.code === "ENOENT");
}
