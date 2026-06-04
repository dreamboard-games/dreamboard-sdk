import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "bun:test";

const repoRoot = path.resolve(import.meta.dir, "../../..");
const retiredPackageDirs = ["app-sdk", "testing", "ui-runtime", "ui-sdk"];
const retiredPackageSpecifiers = retiredPackageDirs.map(
  (name) => `@dreamboard-games/${name}`,
);

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

test("workspace codegen emits SDK UI and runtime imports", async () => {
  const seed = await readFile(
    path.join(repoRoot, "packages/workspace-codegen/src/seeds.ts"),
    "utf8",
  );

  expect(seed).toContain('from "@dreamboard-games/sdk/ui";');
  expect(seed).toContain('from "@dreamboard-games/sdk/generated/runtime";');
  expect(seed).toContain(
    'from "@dreamboard-games/sdk/generated/workspace-contract";',
  );
  expect(seed).toContain(
    'declare module "@dreamboard-games/sdk/generated/runtime"',
  );

  for (const specifier of retiredPackageSpecifiers) {
    expect(seed).not.toContain(specifier);
  }
});
