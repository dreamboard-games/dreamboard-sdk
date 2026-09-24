import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

test("hosted Stormtrail UI bundles without executable reducer or testing code", async () => {
  const result = await build({
    entryPoints: [
      fileURLToPath(new URL("../../ui/index.tsx", import.meta.url)),
    ],
    bundle: true,
    write: false,
    metafile: true,
    platform: "browser",
    format: "esm",
    packages: "bundle",
    external: ["*.css"],
  });
  const files = Object.keys(result.metafile!.inputs);
  assert.equal(
    files.some((path) => /hex-network-trading\/app\//.test(path)),
    false,
  );
  assert.equal(
    files.some((path) =>
      /\/(?:testing|reducer)(?:\/|\.[cm]?js$)|node:/.test(path),
    ),
    false,
  );
  assert.equal(
    files.some((path) => /ui\/game\.ts$/.test(path)),
    true,
  );
});
