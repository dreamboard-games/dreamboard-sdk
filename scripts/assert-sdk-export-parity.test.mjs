import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectDeclarationExports,
  compareExportNames,
  findSyntheticDeclarationAliases,
  getPackageExportEntries,
} from "./assert-sdk-export-parity.mjs";

async function withTempFixture(run) {
  const dir = await mkdtemp(path.join(tmpdir(), "sdk-export-parity-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("collects declaration values with TypeScript symbols and ignores type-only exports", async () => {
  await withTempFixture(async (dir) => {
    const declarationPath = path.join(dir, "index.d.ts");
    await writeFile(
      declarationPath,
      [
        "export interface TypeOnly {}",
        "export type AliasOnly = string;",
        "export declare const runtimeValue: number;",
        "export declare function runtimeFunction(): void;",
        "declare const internalValue: string;",
        "export { internalValue as renamedValue };",
        "",
      ].join("\n"),
    );

    const exports = collectDeclarationExports(declarationPath);

    assert.deepEqual(exports.values, [
      "renamedValue",
      "runtimeFunction",
      "runtimeValue",
    ]);
    assert.ok(exports.all.includes("TypeOnly"));
    assert.ok(!exports.values.includes("TypeOnly"));
  });
});

test("reports missing runtime and missing declaration values separately", () => {
  assert.deepEqual(compareExportNames(["declared"], []), {
    missingRuntime: ["declared"],
    missingDeclaration: [],
  });
  assert.deepEqual(compareExportNames([], ["runtime"]), {
    missingRuntime: [],
    missingDeclaration: ["runtime"],
  });
});

test("rejects synthetic one-letter declaration aliases", () => {
  assert.deepEqual(findSyntheticDeclarationAliases(["D", "Player", "a"]), [
    "D",
    "a",
  ]);
});

test("classifies conditional JavaScript and CSS package exports", () => {
  const entries = getPackageExportEntries({
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
        default: "./dist/index.js",
      },
      "./styles.css": {
        default: "./dist/styles.css",
      },
      "./missing-types": {
        import: "./dist/missing-types.js",
        default: "./dist/missing-types.js",
      },
      "./package.json": "./package.json",
    },
  });

  assert.deepEqual(
    entries.map((entry) => ({
      subpath: entry.subpath,
      importTarget: entry.importTarget,
      declarationTarget: entry.declarationTarget,
      isJavaScript: entry.isJavaScript,
      isCss: entry.isCss,
    })),
    [
      {
        subpath: ".",
        importTarget: "./dist/index.js",
        declarationTarget: "./dist/index.d.ts",
        isJavaScript: true,
        isCss: false,
      },
      {
        subpath: "./styles.css",
        importTarget: "./dist/styles.css",
        declarationTarget: undefined,
        isJavaScript: false,
        isCss: true,
      },
      {
        subpath: "./missing-types",
        importTarget: "./dist/missing-types.js",
        declarationTarget: undefined,
        isJavaScript: true,
        isCss: false,
      },
      {
        subpath: "./package.json",
        importTarget: "./package.json",
        declarationTarget: undefined,
        isJavaScript: false,
        isCss: false,
      },
    ],
  );
});

test("resolves re-export aliases to underlying declaration values", async () => {
  await withTempFixture(async (dir) => {
    await mkdir(path.join(dir, "leaf"));
    await writeFile(
      path.join(dir, "leaf", "index.d.ts"),
      "export declare const leafValue: number;\nexport interface LeafType {}\n",
    );
    const declarationPath = path.join(dir, "index.d.ts");
    await writeFile(
      declarationPath,
      "export { leafValue as publicValue, type LeafType } from './leaf/index.js';\n",
    );

    const exports = collectDeclarationExports(declarationPath);

    assert.deepEqual(exports.values, ["publicValue"]);
    assert.ok(exports.all.includes("LeafType"));
  });
});
