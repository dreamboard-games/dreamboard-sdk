import { describe, expect, test } from "vitest";

import {
  REFERENCE_GAME_MANIFEST_SCHEMA_VERSION,
  parseReferenceGameManifest,
  type ReferenceGameManifest,
} from "./index.js";

function manifest(
  overrides: Partial<ReferenceGameManifest> = {},
): ReferenceGameManifest {
  return {
    schemaVersion: REFERENCE_GAME_MANIFEST_SCHEMA_VERSION,
    id: "hearts",
    displayName: "Hearts",
    workspace: {
      manifest: "manifest.ts",
      reducer: "app/game.ts",
      ui: "ui/index.tsx",
    },
    teaching: {
      whatThisTeaches: ["private player views"],
      whenToCopyThisPattern: ["Use this for hidden hands."],
      readFirst: ["rule.md", "manifest.ts", "app/game.ts"],
    },
    mechanics: ["trick-taking"],
    uiPatterns: ["private-hand"],
    rights: {
      mechanicsProvenance: "traditional-card-game",
      sourceCode: "original-for-this-repository",
      codeLicense: "PolyForm-Shield-1.0.0",
      ruleText: "original-summary",
      thirdPartyMarks: [],
    },
    ...overrides,
  };
}

describe("reference game manifest v5", () => {
  test("parses the authored workspace and substantive rights metadata", () => {
    expect(parseReferenceGameManifest(manifest())).toEqual(manifest());
  });

  test("rejects older schema versions", () => {
    expect(() =>
      parseReferenceGameManifest({ ...manifest(), schemaVersion: 4 }),
    ).toThrow();
  });

  test("rejects workspace and read-first traversal", () => {
    for (const reducer of [
      "../game.ts",
      "/tmp/game.ts",
      "C:/tmp/game.ts",
      "app\\game.ts",
    ]) {
      expect(() =>
        parseReferenceGameManifest({
          ...manifest(),
          workspace: { ...manifest().workspace, reducer },
        }),
      ).toThrow("path must stay inside");
    }
    expect(() =>
      parseReferenceGameManifest({
        ...manifest(),
        teaching: { ...manifest().teaching, readFirst: ["app/../game.ts"] },
      }),
    ).toThrow("path must stay inside");
  });
});
