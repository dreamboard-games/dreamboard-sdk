import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

const jsSubpaths = [
  "@dreamboard-games/sdk",
  "@dreamboard-games/sdk/package-set",
  "@dreamboard-games/sdk/plugin-runtime-contract",
  "@dreamboard-games/sdk/reference-games",
  "@dreamboard-games/sdk/types",
  "@dreamboard-games/sdk/reducer",
  "@dreamboard-games/sdk/reducer/advanced",
  "@dreamboard-games/sdk/ui",
  "@dreamboard-games/sdk/ui/components",
  "@dreamboard-games/sdk/ui/defaults",
  "@dreamboard-games/sdk/ui/player-state",
  "@dreamboard-games/sdk/testing",
  "@dreamboard-games/sdk/testing-compiler",
  "@dreamboard-games/sdk/authoring-compiler",
  "@dreamboard-games/sdk/reference-game-compiler",
  "@dreamboard-games/sdk/runtime",
  "@dreamboard-games/sdk/runtime/primitives",
  "@dreamboard-games/sdk/runtime/workspace-contract",
  "@dreamboard-games/sdk/runtime/runtime-api",
  "@dreamboard-games/sdk/codegen",
  "@dreamboard-games/sdk/reducer-contract",
  "@dreamboard-games/sdk/browser-interaction",
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

  test("dist runtime facade shares canonical workspace-contract modules", async () => {
    const runtime = await import("../dist/runtime.js");
    const workspaceContract =
      await import("../dist/runtime/workspace-contract.js");

    // `./runtime` absorbed the retired `./generated/runtime` facade — it must
    // re-export the same canonical values, not duplicated chunks.
    expect(runtime.PluginRuntime).toBeDefined();
    expect(runtime.createWorkspaceUIContract).toBe(
      workspaceContract.createWorkspaceUIContract,
    );
  });

  test("codegen and reducer-contract facades expose their core surface", async () => {
    const codegen = await import("@dreamboard-games/sdk/codegen");
    const reducerContract =
      await import("@dreamboard-games/sdk/reducer-contract");

    expect(typeof codegen.generateAuthoritativeFiles).toBe("function");
    expect(typeof codegen.generateSeedFiles).toBe("function");
    expect(typeof codegen.materializeManifestTable).toBe("function");
    expect(typeof reducerContract.REDUCER_CONTRACT_VERSION).toBe("string");
    expect(typeof reducerContract.materializeManifestTable).toBe("function");
  });
});
