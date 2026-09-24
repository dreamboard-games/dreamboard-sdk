import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
const subpaths = [
  "@dreamboard-games/sdk",
  "@dreamboard-games/sdk/react",
  "@dreamboard-games/sdk/reducer",
  "@dreamboard-games/sdk/testing",
] as const;
describe("SDK facades", () => {
  for (const subpath of subpaths)
    test(`${subpath} resolves`, async () => {
      expect(await import(subpath)).toBeDefined();
    });
  test("publishes exactly four facades and package metadata", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );
    expect(Object.keys(manifest.exports).sort()).toEqual([
      ".",
      "./package.json",
      "./react",
      "./reducer",
      "./testing",
    ]);
  });
  test("reducer exposes trusted worker admission", async () => {
    const reducer = await import("@dreamboard-games/sdk/reducer");
    expect(typeof reducer.REDUCER_CONTRACT_VERSION).toBe("string");
    expect(typeof reducer.assertReducerBundleContract).toBe("function");
    expect(typeof reducer.materializeManifestTable).toBe("function");
  });
});
