import path from "node:path";

import { describe, expect, test } from "bun:test";

import {
  CANONICAL_REFERENCE_GAME_IDS,
  classifyReferenceGameSourcePath,
  collectReferenceGameSourceManifest,
} from "../reference-game-compiler.js";

const repositoryRoot = path.resolve(import.meta.dir, "../../../..");

describe("reference-game source collector", () => {
  test("collects the canonical nine authored inventories deterministically", async () => {
    const first = await collectReferenceGameSourceManifest({
      sourceRoot: repositoryRoot,
      provenance: { kind: "worktree" },
    });
    const second = await collectReferenceGameSourceManifest({
      sourceRoot: repositoryRoot,
      provenance: { kind: "worktree" },
    });

    expect(first.payload.games.map(({ id }) => id)).toEqual([
      ...CANONICAL_REFERENCE_GAME_IDS,
    ]);
    expect(first.sourceFingerprint).toBe(second.sourceFingerprint);
    expect(first.payload.objects).toEqual(second.payload.objects);
    expect(
      first.payload.objects.every(
        ({ path: objectPath }) =>
          classifyReferenceGameSourcePath(objectPath) === "included",
      ),
    ).toBe(true);
  });
});
