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

test("the headless template submits through its production-shaped local source", async () => {
  const { createGameInstance } = await import("@dreamboard-games/sdk");
  const { createDevelopmentSource } = await import("../ui/development-source");
  const source = await createDevelopmentSource(new URLSearchParams());
  const instance = createGameInstance<typeof import("../app/game").default>()({
    source,
  });
  try {
    expect(instance.view?.count).toBe(0);
    expect(
      await instance.interactions.get("play.increment")!.submit(),
    ).toMatchObject({ accepted: true });
    expect(instance.view?.count).toBe(1);
  } finally {
    instance.dispose();
  }
});

test("the local entry restores the authored named checkpoint", async () => {
  const { createDevelopmentSource } = await import("../ui/development-source");
  const source = await createDevelopmentSource(
    new URLSearchParams("scenario=increment&at=incremented"),
  );
  try {
    expect(source.inspect().frame.view).toMatchObject({ count: 1 });
  } finally {
    source.dispose();
  }
});

test("the hosted entry excludes executable game and testing code", async () => {
  const { build } = await import("esbuild");
  const result = await build({
    entryPoints: [new URL("../ui/index.tsx", import.meta.url).pathname],
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    metafile: true,
  });
  const inputs = Object.keys(result.metafile!.inputs);
  expect(inputs.some((path) => /(?:^|\/)app\//.test(path))).toBe(false);
  expect(
    inputs.some((path) =>
      /sdk\/(src|dist)\/(reducer|testing)(?:[./]|$)/.test(path),
    ),
  ).toBe(false);
});
