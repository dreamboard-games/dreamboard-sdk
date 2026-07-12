import { describe, expect, test } from "bun:test";

import {
  compareReferenceGameCanonicalStrings,
  computeReferenceGameSourceFingerprint,
  isPackageableReferenceGame,
  parseReferenceGameManifestV3,
  parseReferenceGameSourceManifest,
  type ReferenceGameManifestV3,
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
    inventoryPolicy: {
      schemaVersion: 1,
      workspaceOwnershipVersion: 31,
      excludedGameRelativePaths: ["shared/manifest-runtime.ts", "app/index.ts"],
      excludedGameRelativePrefixes: ["test/generated/", "test/bases/"],
    },
    games: [
      {
        id: "hearts",
        root: "examples/reference-games/hearts",
        sourceSha256: digestA,
        packageJsonSha256: digestB,
        lockfileSha256: digestC,
        sdkSpecifier: "0.4.0-alpha.7",
        manifest: "manifest.ts",
        reducer: "app/game.ts",
        ui: "ui/index.tsx",
        behaviorScenarios: ["test/scenarios/pass-three.scenario.ts"],
        uiScenarios: ["test/ui-scenarios/pass-three.mobile.scenario.ts"],
        mechanics: ["hidden-information", "trick-taking"],
        readFirst: ["rule.md", "manifest.ts", "app/game.ts"],
      },
      {
        id: "hex-network-trading",
        root: "examples/reference-games/hex-network-trading",
        sourceSha256: digestB,
        packageJsonSha256: digestC,
        lockfileSha256: digestD,
        sdkSpecifier: "0.4.0-alpha.7",
        manifest: "manifest.ts",
        reducer: "app/game.ts",
        ui: "ui/index.tsx",
        behaviorScenarios: ["test/scenarios/place-route.scenario.ts"],
        uiScenarios: ["test/ui-scenarios/place-route.desktop.scenario.ts"],
        mechanics: ["hex-grid", "route-building"],
        readFirst: ["rule.md", "manifest.ts", "app/game.ts"],
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

function referenceGameManifest(
  overrides: Partial<ReferenceGameManifestV3> = {},
): ReferenceGameManifestV3 {
  return {
    schemaVersion: 3,
    id: "hearts",
    displayName: "Hearts",
    workspace: {
      manifest: "manifest.ts",
      reducer: "app/game.ts",
      ui: "ui/index.tsx",
      behaviorScenarios: ["test/scenarios/smoke-initial-turn.scenario.ts"],
      uiScenarios: ["test/ui-scenarios/pass-three.mobile.scenario.ts"],
    },
    teaching: {
      whatThisTeaches: ["hidden hands"],
      whenToCopyThisPattern: ["Use for private player views."],
      readFirst: ["rule.md", "manifest.ts", "app/game.ts"],
    },
    mechanics: ["trick-taking"],
    uiPatterns: ["private-hand"],
    rights: {
      mechanicsProvenance: "traditional-card-game",
      sourceCode: "original-for-this-repository",
      codeLicense: "PolyForm-Shield-1.0.0",
      ruleText: "original-summary",
      artwork: "repository-owned-or-licensed",
      assetLicenseManifest: "assets/LICENSES.json",
      thirdPartyMarks: [],
      reviewStatus: "approved",
      reviewedBy: "rights-owner-or-counsel",
      reviewedAt: "2026-06-16",
    },
    sdk: {
      dependency: "@dreamboard-games/sdk",
      versionPolicy: "exact",
    },
    ...overrides,
  };
}

function demoRelease(): NonNullable<ReferenceGameManifestV3["demoRelease"]> {
  return {
    slug: "hearts",
    name: "Hearts",
    description: "A four-player trick-taking card game.",
    overview: "Pass cards, follow suit, and avoid points.",
    creator: "Dreamboard",
    minPlayers: 4,
    maxPlayers: 4,
    playTimeMinMinutes: 20,
    playTimeMaxMinutes: 40,
    difficulty: 2,
    mechanics: ["trick-taking", "hidden-information"],
    categories: ["card-game", "classic"],
    thumbnailPath: "assets/thumbnail.svg",
    estimatedMinutes: 10,
    demoPlayerCount: 4,
  };
}

describe("reference game source manifest", () => {
  test("canonical ordering is locale-independent UTF-16 code-unit order", () => {
    const values = ["z", "ä", "a", "😀", "\uffff"];
    expect(values.sort(compareReferenceGameCanonicalStrings)).toEqual([
      "a",
      "z",
      "ä",
      "😀",
      "\uffff",
    ]);
  });

  test("fingerprint is independent of game, object, and policy ordering", () => {
    const first = payload();
    const second = payload({
      inventoryPolicy: {
        ...first.inventoryPolicy,
        excludedGameRelativePaths: [
          ...first.inventoryPolicy.excludedGameRelativePaths,
        ].reverse(),
        excludedGameRelativePrefixes: [
          ...first.inventoryPolicy.excludedGameRelativePrefixes,
        ].reverse(),
      },
      games: [...first.games].reverse(),
      objects: [...first.objects].reverse(),
    });

    expect(computeReferenceGameSourceFingerprint(first)).toBe(
      computeReferenceGameSourceFingerprint(second),
    );
  });

  test("digest changes when an entrypoint changes", () => {
    const first = payload();
    const second = payload({
      games: [{ ...first.games[0], reducer: "app/other-game.ts" }],
    });

    expect(computeReferenceGameSourceFingerprint(first)).not.toBe(
      computeReferenceGameSourceFingerprint(second),
    );
  });

  test("digest changes when an object changes", () => {
    const first = payload();
    const second = payload({
      objects: [{ ...first.objects[0], sha256: digestD }],
    });

    expect(computeReferenceGameSourceFingerprint(first)).not.toBe(
      computeReferenceGameSourceFingerprint(second),
    );
  });

  test("parse rejects mismatched bundle digest", () => {
    expect(() =>
      parseReferenceGameSourceManifest({
        schemaVersion: 3,
        manifestType: "dreamboard.reference-game-source",
        sourceFingerprint: digestA,
        payload: payload(),
        provenance: { kind: "worktree" },
      }),
    ).toThrow("sourceFingerprint must match");
  });

  test("worktree and git provenance do not affect the bundle digest", () => {
    const source = payload();
    const sourceFingerprint = computeReferenceGameSourceFingerprint(source);

    expect(
      parseReferenceGameSourceManifest({
        schemaVersion: 3,
        manifestType: "dreamboard.reference-game-source",
        sourceFingerprint,
        payload: source,
        provenance: { kind: "worktree" },
      }).sourceFingerprint,
    ).toBe(sourceFingerprint);
    expect(
      parseReferenceGameSourceManifest({
        schemaVersion: 3,
        manifestType: "dreamboard.reference-game-source",
        sourceFingerprint,
        payload: source,
        provenance: {
          kind: "git",
          repository: "dreamboard-games/dreamboard-sdk",
          revision: "1".repeat(40),
        },
      }).sourceFingerprint,
    ).toBe(sourceFingerprint);
  });
});

describe("reference game manifest v3", () => {
  test("rejects the removed publishToDemoGallery field", () => {
    expect(() =>
      parseReferenceGameManifestV3({
        ...referenceGameManifest(),
        publishToDemoGallery: true,
      }),
    ).toThrow();
  });

  test("rejects release channel policy", () => {
    expect(() =>
      parseReferenceGameManifestV3({
        ...referenceGameManifest(),
        releaseChannels: ["preview"],
      }),
    ).toThrow();
  });

  test("keeps teaching-only games valid and non-packageable", () => {
    const manifest = parseReferenceGameManifestV3(referenceGameManifest());

    expect(isPackageableReferenceGame(manifest)).toBe(false);
  });

  test("recognizes complete demoRelease metadata as packageable", () => {
    const manifest = parseReferenceGameManifestV3(
      referenceGameManifest({ demoRelease: demoRelease() }),
    );

    expect(isPackageableReferenceGame(manifest)).toBe(true);
  });

  test("rejects malformed demoRelease metadata", () => {
    expect(() =>
      parseReferenceGameManifestV3(
        referenceGameManifest({
          demoRelease: {
            slug: "hearts",
          } as ReferenceGameManifestV3["demoRelease"],
        }),
      ),
    ).toThrow();
  });

  test("rejects removed hero and screenshot media fields", () => {
    expect(() =>
      parseReferenceGameManifestV3(
        referenceGameManifest({
          demoRelease: {
            ...demoRelease(),
            heroImageUrl: "/demos/hearts/desktop.png",
          } as ReferenceGameManifestV3["demoRelease"],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseReferenceGameManifestV3(
        referenceGameManifest({
          demoRelease: {
            ...demoRelease(),
            screenshot: { presets: {} },
          } as ReferenceGameManifestV3["demoRelease"],
        }),
      ),
    ).toThrow();
  });

  test("requires a safe game-relative thumbnail asset path", () => {
    for (const thumbnailPath of [
      "/assets/thumbnail.svg",
      "../thumbnail.svg",
      "assets/../thumbnail.svg",
      "thumbnail.svg",
    ]) {
      expect(() =>
        parseReferenceGameManifestV3(
          referenceGameManifest({
            demoRelease: {
              ...demoRelease(),
              thumbnailPath,
            },
          }),
        ),
      ).toThrow();
    }
  });
});
