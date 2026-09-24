import { build } from "esbuild";
import { expect, test } from "vitest";
test("hosted core has no executable game, reducer, React, or Node import closure", async () => {
  const result = await build({
    entryPoints: [new URL("./instance.ts", import.meta.url).pathname],
    bundle: true,
    write: false,
    platform: "browser",
    format: "esm",
    metafile: true,
  });
  const files = Object.keys(result.metafile!.inputs);
  expect(files.some((file) => file.includes("/reducer/"))).toBe(false);
  expect(
    files.some((file) => file.includes("react/") || file.includes("node:")),
  ).toBe(false);
});
