import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";
import * as reducer from "./reducer";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("@dreamboard-games/app-sdk public surface", () => {
  test("only exposes the canonical reducer subpath", () => {
    const packageJson = JSON.parse(
      readFileSync(join(packageRoot, "package.json"), "utf8"),
    ) as {
      exports: Record<string, unknown>;
    };

    expect(Object.keys(packageJson.exports).sort()).toEqual([
      "./package.json",
      "./reducer",
    ]);
    expect(packageJson.exports).not.toHaveProperty(".");
    expect(packageJson.exports).not.toHaveProperty("./internal");
    expect(packageJson.exports).not.toHaveProperty("./reducer/*");
  });

  test("reducer barrel exposes authoring helpers without trusted runtime internals", () => {
    expect(reducer).toHaveProperty("createReducerBundle");
    expect(reducer).toHaveProperty("defineGame");
    expect(reducer).toHaveProperty("perPlayer");
    expect(reducer).toHaveProperty("createTableQueries");
    expect(reducer).toHaveProperty("applySetupBootstrap");
    expect(reducer).toHaveProperty("shuffle");
    expect(reducer).toHaveProperty("dealToPlayerZone");
    expect(reducer).toHaveProperty("dealToPlayerBoardContainer");
    expect(reducer).toHaveProperty("seedSharedBoardContainer");
    expect(reducer).toHaveProperty("seedSharedBoardSpace");
    expect(reducer).not.toHaveProperty("createTrustedReducerBundle");
  });
});
