import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { collectReferenceGameSourceObjects } from "./build-source-manifest.mjs";
import {
  CANONICAL_REFERENCE_GAME_IDS,
  classifyReferenceGameSourcePath,
  REFERENCE_GAME_SOURCE_INVENTORY_POLICY,
} from "./source-inventory-policy.mjs";
import { WORKSPACE_CODEGEN_OWNERSHIP } from "../../packages/workspace-codegen/src/ownership.ts";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const ignoreBlockStart = "# BEGIN reference-game workspace-codegen outputs";
const ignoreBlockEnd = "# END reference-game workspace-codegen outputs";

const gamePath = (gameId, ...segments) =>
  ["examples", "reference-games", gameId, ...segments].join("/");

test("workspace ownership is the generated-path authority", () => {
  assert.ok(
    REFERENCE_GAME_SOURCE_INVENTORY_POLICY.excludedGameRelativePaths.includes(
      "shared/manifest-runtime.ts",
    ),
  );
  assert.equal(
    classifyReferenceGameSourcePath(
      gamePath("hearts", "shared", "manifest-runtime.ts"),
    ),
    "workspace-generated",
  );
  assert.equal(
    classifyReferenceGameSourcePath(
      gamePath("hearts", "test", "generated", "base-state.json"),
    ),
    "test-generated",
  );
  assert.equal(
    classifyReferenceGameSourcePath(
      gamePath("hearts", "test", "bases", "initial.base.ts"),
    ),
    "test-base",
  );
  assert.equal(
    classifyReferenceGameSourcePath(gamePath("hearts", "app", "game.ts")),
    "included",
  );
});

test("all nine game roots ignore exactly the workspace-codegen outputs and retain authored paths", async () => {
  const expectedPatterns = [
    ...WORKSPACE_CODEGEN_OWNERSHIP.dynamic.generatedFiles,
  ]
    .sort()
    .map((ownedPath) => `/examples/reference-games/*/${ownedPath}`);
  const ignoreSource = await readFile(
    path.join(repositoryRoot, ".gitignore"),
    "utf8",
  );
  const block = ignoreSource
    .slice(
      ignoreSource.indexOf(ignoreBlockStart) + ignoreBlockStart.length,
      ignoreSource.indexOf(ignoreBlockEnd),
    )
    .trim()
    .split("\n");
  assert.deepEqual(block, expectedPatterns);

  for (const gameId of CANONICAL_REFERENCE_GAME_IDS) {
    for (const generatedPath of WORKSPACE_CODEGEN_OWNERSHIP.dynamic
      .generatedFiles) {
      assert.equal(
        isIgnored(gamePath(gameId, ...generatedPath.split("/"))),
        true,
        `${gameId}/${generatedPath} must be ignored`,
      );
    }
    for (const authoredPath of [
      "manifest.ts",
      "reference-game.json",
      "rule.md",
      ...WORKSPACE_CODEGEN_OWNERSHIP.dynamic.seedFiles,
    ]) {
      assert.equal(
        isIgnored(gamePath(gameId, ...authoredPath.split("/"))),
        false,
        `${gameId}/${authoredPath} must remain visible to Git`,
      );
    }
  }
});

test("local materialization cannot change the authored object inventory", async () => {
  const sourceRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-source-inventory-"),
  );
  try {
    const gameRoot = path.join(
      sourceRoot,
      "examples",
      "reference-games",
      "hearts",
    );
    await write(gameRoot, "app/game.ts", "export const game = 1;\n");
    await write(gameRoot, "manifest.ts", "export const manifest = {};\n");

    const before = await collect(sourceRoot);

    await write(
      gameRoot,
      "shared/manifest-runtime.ts",
      "// generated workspace output\n",
    );
    await write(
      gameRoot,
      "test/generated/base-state.json",
      '{"generated":true}\n',
    );
    await write(
      gameRoot,
      "test/bases/legacy.base.ts",
      "// legacy checked state\n",
    );
    await write(
      gameRoot,
      ".dreamboard/checkpoints/local.json",
      '{"local":true}\n',
    );

    const afterMaterialization = await collect(sourceRoot);
    assert.deepEqual(afterMaterialization, before);

    await write(gameRoot, "app/game.ts", "export const game = 2;\n");
    const afterAuthoredChange = await collect(sourceRoot);
    assert.notDeepEqual(afterAuthoredChange, before);
    assert.notEqual(
      afterAuthoredChange.find(({ path: objectPath }) =>
        objectPath.endsWith("/app/game.ts"),
      )?.sha256,
      before.find(({ path: objectPath }) => objectPath.endsWith("/app/game.ts"))
        ?.sha256,
    );
  } finally {
    await rm(sourceRoot, { recursive: true, force: true });
  }
});

async function collect(sourceRoot) {
  return collectReferenceGameSourceObjects({
    sourceRoot,
    referenceGamesRoot: path.join(sourceRoot, "examples/reference-games"),
  });
}

async function write(gameRoot, relativePath, contents) {
  const destination = path.join(gameRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, contents);
}

function isIgnored(repositoryPath) {
  const result = spawnSync(
    "git",
    ["check-ignore", "--quiet", "--no-index", "--", repositoryPath],
    { cwd: repositoryRoot },
  );
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `git check-ignore failed for ${repositoryPath}: ${result.stderr?.toString("utf8") ?? ""}`,
    );
  }
  return result.status === 0;
}
