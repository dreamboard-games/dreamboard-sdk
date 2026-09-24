import { expect, test } from "vitest";
import { compileManifest } from "@dreamboard-games/sdk/reducer";
import manifest from "../manifest";
import bundle from "../app/index";
test("the authored template compiles without generated workspace files", () => {
  expect(
    compileManifest(manifest).createInitialTable({ playerIds: ["player-1"] })
      .playerOrder,
  ).toEqual(["player-1"]);
  expect(Object.keys(bundle).sort()).toEqual([
    "boardStatic",
    "dispatch",
    "initialize",
    "project",
    "reducerContractVersion",
  ]);
});
