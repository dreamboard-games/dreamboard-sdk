import { build } from "esbuild";
import { expect, test } from "vitest";

test("features bundle without React, executable reducer, or browser globals", async () => {
  const result = await build({
    entryPoints: ["hand", "board", "drag", "pan-zoom"].map(
      (name) => new URL(`./${name}.ts`, import.meta.url).pathname,
    ),
    bundle: true,
    write: false,
    outdir: "/unused-feature-output",
    platform: "browser",
    format: "esm",
    metafile: true,
  });
  const files = Object.keys(result.metafile!.inputs);
  expect(
    files.some(
      (file) =>
        file.includes("/reducer/") ||
        file.includes("react/") ||
        file.includes("node:"),
    ),
  ).toBe(false);
  for (const output of result.outputFiles)
    await import(
      `data:text/javascript;base64,${Buffer.from(output.text).toString("base64")}`
    );
});
