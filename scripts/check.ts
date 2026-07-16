import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { generateReducerContract } from "../packages/reducer-contract/scripts/generate.ts";
import { walkFiles } from "./lib/files.ts";
import { rootDir } from "./lib/paths.ts";
import { run } from "./lib/process.ts";
import {
  assertPublicationBoundary,
  assertSdkExportParity,
  packAndVerifySdk,
} from "./package.ts";
import { verifyReferenceGames } from "./reference/index.ts";

export type CoreCheckOptions = {
  referenceGames?: boolean;
};

export function format(write: boolean): void {
  run("pnpm", ["exec", "prettier", write ? "--write" : "--check", "."], {
    cwd: rootDir,
  });
}

export function lint(): void {
  run("pnpm", ["exec", "turbo", "run", "lint"], { cwd: rootDir });
  run(
    "pnpm",
    [
      "exec",
      "eslint",
      "scripts/**/*.ts",
      "packages/reducer-contract/scripts/**/*.ts",
    ],
    { cwd: rootDir },
  );
}

export function typecheck(): void {
  run("pnpm", ["exec", "turbo", "run", "typecheck"], { cwd: rootDir });
  run("pnpm", ["exec", "tsc", "-p", "tsconfig.scripts.json"], {
    cwd: rootDir,
  });
}

export function build(): void {
  run(
    "pnpm",
    [
      "exec",
      "turbo",
      "run",
      "build",
      "--filter=!@dreamboard-games/ui-workbench",
    ],
    { cwd: rootDir },
  );
}

export function generate(write: boolean): void {
  const result = generateReducerContract({ mode: write ? "write" : "check" });
  console.log(
    `${write ? "Generated" : "Checked"} reducer contract ${result.version} (${result.files.length} files).`,
  );
}

function testWorkspacePackages(): void {
  run(
    "pnpm",
    [
      "exec",
      "turbo",
      "run",
      "test",
      "--filter=!@dreamboard-games/ui-workbench",
    ],
    { cwd: rootDir },
  );
}

async function testRepositoryScripts(): Promise<void> {
  const scriptTests = (await walkFiles(path.join(rootDir, "scripts"))).filter(
    (filePath) => filePath.endsWith(".test.ts"),
  );
  const generatorTests = (
    await walkFiles(path.join(rootDir, "packages/reducer-contract/scripts"))
  ).filter((filePath) => filePath.endsWith(".test.ts"));
  const tests = [...scriptTests, ...generatorTests];
  if (tests.length > 0) {
    run(process.execPath, ["--test", "--test-concurrency=1", ...tests], {
      cwd: rootDir,
    });
  }
}

export async function test(): Promise<void> {
  testWorkspacePackages();
  await testRepositoryScripts();
}

export async function runCoreCheck(
  options: CoreCheckOptions = {},
): Promise<void> {
  const includeReferenceGames = options.referenceGames !== false;
  format(false);
  lint();
  typecheck();
  generate(false);
  build();
  await assertPublicationBoundary();
  await assertSdkExportParity();
  await testRepositoryScripts();
  testWorkspacePackages();

  if (!includeReferenceGames) return;
  const temporary = await mkdtemp(
    path.join(tmpdir(), "dreamboard-sdk-check-package-"),
  );
  try {
    const packed = await packAndVerifySdk(temporary);
    await verifyReferenceGames({ root: rootDir, sdkTarball: packed.path });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
