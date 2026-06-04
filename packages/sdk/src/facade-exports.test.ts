import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

const jsSubpaths = [
  "@dreamboard-games/sdk",
  "@dreamboard-games/sdk/package-set",
  "@dreamboard-games/sdk/types",
  "@dreamboard-games/sdk/reducer",
  "@dreamboard-games/sdk/ui",
  "@dreamboard-games/sdk/ui/components",
  "@dreamboard-games/sdk/ui/defaults",
  "@dreamboard-games/sdk/ui/types/player-state",
  "@dreamboard-games/sdk/testing",
  "@dreamboard-games/sdk/runtime",
  "@dreamboard-games/sdk/runtime/primitives",
  "@dreamboard-games/sdk/runtime/workspace-contract",
  "@dreamboard-games/sdk/runtime/types/runtime-api",
  "@dreamboard-games/sdk/generated/runtime",
  "@dreamboard-games/sdk/generated/runtime/primitives",
  "@dreamboard-games/sdk/generated/workspace-contract",
  "@dreamboard-games/sdk/generated/runtime-api",
  "@dreamboard-games/sdk/infrastructure/reducer-bundle-abi",
  "@dreamboard-games/sdk/infrastructure/workspace-codegen",
] as const;

describe("SDK facade exports", () => {
  for (const subpath of jsSubpaths) {
    test(`${subpath} resolves`, async () => {
      const module = await import(subpath);

      expect(module).toBeDefined();
    });
  }

  test("exports plugin styles through the facade package", () => {
    expect(existsSync(`${packageRoot}/dist/ui/plugin-styles.css`)).toBe(true);
  });
});
