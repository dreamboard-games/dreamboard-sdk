import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const retiredPackageDirs = [
  "app-sdk",
  "testing",
  "ui-runtime",
  "ui-sdk",
  "workspace-codegen",
];

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await readdir(filePath);
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

test("retired leaf package source directories stay removed", async () => {
  const offenders: string[] = [];
  for (const dirName of retiredPackageDirs) {
    if (await pathExists(path.join(repoRoot, "packages", dirName))) {
      offenders.push(`packages/${dirName}`);
    }
  }

  expect(offenders).toEqual([]);
});

test("authoring generation is absent from the published package", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, "packages/sdk/package.json"), "utf8"),
  );
  expect(manifest.bin).toBeUndefined();
  for (const name of ["./authoring", "./authoring-compiler", "./codegen"])
    expect(manifest.exports[name]).toBeUndefined();
});
