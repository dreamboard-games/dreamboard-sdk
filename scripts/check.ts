import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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
  run("pnpm", ["exec", "eslint", "scripts/**/*.ts"], { cwd: rootDir });
}

export function typecheck(): void {
  run("pnpm", ["exec", "turbo", "run", "typecheck"], { cwd: rootDir });
  run("pnpm", ["exec", "tsc", "-p", "tsconfig.scripts.json"], {
    cwd: rootDir,
  });
}

export function build(): void {
  run("pnpm", ["exec", "turbo", "run", "build"], { cwd: rootDir });
}

function testWorkspacePackages(): void {
  run("pnpm", ["exec", "turbo", "run", "test"], { cwd: rootDir });
}

async function testRepositoryScripts(): Promise<void> {
  const scriptTests = (await walkFiles(path.join(rootDir, "scripts"))).filter(
    (filePath) => filePath.endsWith(".test.ts"),
  );
  const tests = scriptTests;
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
  // Workspace Turbo tasks below include registry typecheck and shadcn build.
  run("pnpm", ["--dir", "registry", "validate"], { cwd: rootDir });
  lint();
  typecheck();
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
