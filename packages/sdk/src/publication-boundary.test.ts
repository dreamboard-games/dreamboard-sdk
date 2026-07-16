import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "bun:test";

const repoRoot = path.resolve(import.meta.dir, "../../..");
// `workspace-codegen` exists again as a *private* workspace package, so it is
// no longer a retired directory — but its specifier must still never appear
// in emitted workspace code (generated games only talk to the public sdk).
const retiredPackageDirs = ["app-sdk", "testing", "ui-runtime", "ui-sdk"];
// Note: seeds.ts itself imports @dreamboard-games/sdk-types (a private
// workspace dep), so the forbidden list only covers specifiers that must not
// appear anywhere — emitted templates or source. Private workspace packages
// other than sdk-types are still banned because generated games may only
// import the public sdk.
const retiredPackageSpecifiers = [
  ...retiredPackageDirs.map((name) => `@dreamboard-games/${name}`),
  "@dreamboard-games/workspace-codegen",
  "@dreamboard-games/reducer-contract",
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

test("workspace codegen emits only the thin SDK workspace contract", async () => {
  const seed = await readFile(
    path.join(repoRoot, "packages/workspace-codegen/src/seeds.ts"),
    "utf8",
  );

  expect(seed).toContain(
    'from "@dreamboard-games/sdk/runtime/workspace-contract";',
  );
  expect(seed).toContain('declare module "@dreamboard-games/sdk/runtime"');
  expect(seed).not.toContain("createClientParamSchemasByPhase");
  expect(seed).not.toContain("createWorkspaceUIContract");
  // The retired facade namespaces must never re-enter emitted code.
  expect(seed).not.toContain("@dreamboard-games/sdk/generated/");
  expect(seed).not.toContain("@dreamboard-games/sdk/infrastructure/");

  for (const specifier of retiredPackageSpecifiers) {
    expect(seed).not.toContain(specifier);
  }
});
