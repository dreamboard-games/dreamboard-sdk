import { describe, expect, test } from "bun:test";

import {
  computeReferenceGameSourceDigest,
  parseReferenceGameSourceManifest,
  type ReferenceGameSourceManifestPayload,
} from "./index.js";

const digestA = `sha256:${"a".repeat(64)}` as const;
const digestB = `sha256:${"b".repeat(64)}` as const;
const digestC = `sha256:${"c".repeat(64)}` as const;
const digestD = `sha256:${"d".repeat(64)}` as const;

function payload(
  overrides: Partial<ReferenceGameSourceManifestPayload> = {},
): ReferenceGameSourceManifestPayload {
  return {
    games: [
      {
        id: "hearts",
        root: "examples/reference-games/hearts",
        sourceSha256: digestA,
        packageJsonSha256: digestB,
        lockfileSha256: digestC,
        sdkSpecifier: "0.4.0-alpha.6",
        manifest: "manifest.ts",
        reducer: "app/game.ts",
        ui: "ui/index.tsx",
        behaviorScenarios: ["test/scenarios/pass-three.scenario.ts"],
        uiScenarios: ["test/ui-scenarios/pass-three.mobile.scenario.ts"],
        mechanics: ["hidden-information", "trick-taking"],
        readFirst: ["rule.md", "manifest.ts", "app/game.ts"],
        publishToDemoGallery: true,
      },
      {
        id: "hex-network-trading",
        root: "examples/reference-games/hex-network-trading",
        sourceSha256: digestB,
        packageJsonSha256: digestC,
        lockfileSha256: digestD,
        sdkSpecifier: "0.4.0-alpha.6",
        manifest: "manifest.ts",
        reducer: "app/game.ts",
        ui: "ui/index.tsx",
        behaviorScenarios: ["test/scenarios/place-route.scenario.ts"],
        uiScenarios: ["test/ui-scenarios/place-route.desktop.scenario.ts"],
        mechanics: ["hex-grid", "route-building"],
        readFirst: ["rule.md", "manifest.ts", "app/game.ts"],
        publishToDemoGallery: false,
      },
    ],
    objects: [
      {
        path: "examples/reference-games/hearts/manifest.ts",
        sha256: digestA,
        byteLength: 12,
      },
      {
        path: "examples/reference-games/hearts/app/game.ts",
        sha256: digestB,
        byteLength: 34,
      },
    ],
    ...overrides,
  };
}

describe("reference game source manifest", () => {
  test("digest is independent of game and object ordering", () => {
    const first = payload();
    const second = payload({
      games: [...first.games].reverse(),
      objects: [...first.objects].reverse(),
    });

    expect(computeReferenceGameSourceDigest(first)).toBe(
      computeReferenceGameSourceDigest(second),
    );
  });

  test("digest changes when an entrypoint changes", () => {
    const first = payload();
    const second = payload({
      games: [{ ...first.games[0], reducer: "app/other-game.ts" }],
    });

    expect(computeReferenceGameSourceDigest(first)).not.toBe(
      computeReferenceGameSourceDigest(second),
    );
  });

  test("digest changes when an object changes", () => {
    const first = payload();
    const second = payload({
      objects: [{ ...first.objects[0], sha256: digestD }],
    });

    expect(computeReferenceGameSourceDigest(first)).not.toBe(
      computeReferenceGameSourceDigest(second),
    );
  });

  test("parse rejects mismatched bundle digest", () => {
    expect(() =>
      parseReferenceGameSourceManifest({
        schemaVersion: 1,
        manifestType: "dreamboard.reference-game-source",
        bundleDigest: digestA,
        payload: payload(),
        provenance: { kind: "worktree" },
      }),
    ).toThrow("bundleDigest must match");
  });

  test("worktree and git provenance do not affect the bundle digest", () => {
    const source = payload();
    const bundleDigest = computeReferenceGameSourceDigest(source);

    expect(
      parseReferenceGameSourceManifest({
        schemaVersion: 1,
        manifestType: "dreamboard.reference-game-source",
        bundleDigest,
        payload: source,
        provenance: { kind: "worktree" },
      }).bundleDigest,
    ).toBe(bundleDigest);
    expect(
      parseReferenceGameSourceManifest({
        schemaVersion: 1,
        manifestType: "dreamboard.reference-game-source",
        bundleDigest,
        payload: source,
        provenance: {
          kind: "git",
          repository: "dreamboard-games/dreamboard-sdk",
          revision: "1".repeat(40),
        },
      }).bundleDigest,
    ).toBe(bundleDigest);
  });
});
