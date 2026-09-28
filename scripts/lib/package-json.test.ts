import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readPackageJson } from "./package-json.ts";

test("package reads validate consumed fields while retaining metadata for rewrites", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "package-json-"));
  const file = path.join(directory, "package.json");
  try {
    const source = {
      name: "fixture",
      packageManager: "pnpm@10.4.1",
      license: "MIT",
      engines: { node: ">=24" },
      dependencies: { example: "^1.0.0" },
      peerDependenciesMeta: { react: { optional: true } },
      publishConfig: {
        access: "public",
        registry: "https://registry.npmjs.org",
      },
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
          browser: "./dist/browser.js",
        },
      },
      customMetadata: { nested: [1, "two"] },
    };
    await writeFile(file, JSON.stringify(source));
    const parsed = await readPackageJson(file);
    parsed.dependencies = { ...parsed.dependencies, added: "2.0.0" };
    assert.deepEqual(parsed, {
      ...source,
      dependencies: { ...source.dependencies, added: "2.0.0" },
    });
    for (const invalid of [
      null,
      [],
      { dependencies: { example: 42 } },
      { scripts: { test: false } },
      { exports: { ".": { types: 42 } } },
    ]) {
      await writeFile(file, JSON.stringify(invalid));
      await assert.rejects(readPackageJson(file));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
