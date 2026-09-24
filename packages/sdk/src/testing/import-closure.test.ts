import { build } from "esbuild";
import { expect, test } from "vitest";

test("the complete testing facade bundles for browsers without Node externals", async () => {
  const result = await build({
    entryPoints: [new URL("../testing.ts", import.meta.url).pathname],
    bundle: true,
    write: false,
    platform: "browser",
    format: "esm",
    metafile: true,
  });
  expect(
    Object.values(result.metafile!.outputs).flatMap((output) => output.imports),
  ).toEqual([]);
});
