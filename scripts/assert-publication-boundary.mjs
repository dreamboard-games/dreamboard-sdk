import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { sdkPackages } from "./sdk-packages.mjs";

const root = path.resolve(import.meta.dirname, "..");
const packagesDir = path.join(root, "packages");
const publicPackageName = "@dreamboard-games/sdk";
const removedLeafPackageNames = new Set([
  "@dreamboard-games/app-sdk",
  "@dreamboard-games/plugin-runtime-contract",
  "@dreamboard-games/reducer-contract",
  "@dreamboard-games/sdk-types",
  "@dreamboard-games/testing",
  "@dreamboard-games/ui-runtime",
  "@dreamboard-games/ui-sdk",
  "@dreamboard-games/ui-workbench",
  "@dreamboard-games/workspace-codegen",
]);
// `workspace-codegen` is intentionally absent: it exists again as a private
// workspace package (packages/workspace-codegen). Its name stays in
// `removedLeafPackageNames` above so the boundary check enforces it is
// private and never published.
const retiredSourcePackageDirs = ["app-sdk", "testing", "ui-runtime", "ui-sdk"];

function fail(message) {
  throw new Error(`SDK publication boundary violation: ${message}`);
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function assertKnownPublicPackages() {
  const names = sdkPackages.map((pkg) => pkg.name);
  if (names.length !== 1 || names[0] !== publicPackageName) {
    fail(
      `scripts/sdk-packages.mjs must list only ${publicPackageName}; got ${names.join(", ")}`,
    );
  }
}

async function assertPackageManifests() {
  const rootManifest = await readJson(path.join(root, "package.json"));
  if (rootManifest.private !== true) {
    fail("root package.json must remain private");
  }

  for (const packageDir of retiredSourcePackageDirs) {
    const retiredPackagePath = path.join(packagesDir, packageDir);
    if (await pathExists(retiredPackagePath)) {
      fail(
        `packages/${packageDir} must not exist; use ${publicPackageName} as the canonical source`,
      );
    }
  }

  const packageDirs = await readdir(packagesDir, { withFileTypes: true });
  for (const entry of packageDirs) {
    if (!entry.isDirectory()) {
      continue;
    }
    const packageJsonPath = path.join(packagesDir, entry.name, "package.json");
    const manifest = await readJson(packageJsonPath);
    const relativePath = path.relative(root, packageJsonPath);

    if (manifest.name === publicPackageName) {
      if (manifest.private === true) {
        fail(`${relativePath} marks ${publicPackageName} private`);
      }
      if (manifest.publishConfig?.access !== "public") {
        fail(`${relativePath} must be the only public publishConfig`);
      }
      continue;
    }

    if (removedLeafPackageNames.has(manifest.name)) {
      if (manifest.private !== true) {
        fail(`${relativePath} must set private: true`);
      }
      if (manifest.publishConfig !== undefined) {
        fail(`${relativePath} must not declare publishConfig`);
      }
      continue;
    }

    if (
      typeof manifest.name === "string" &&
      manifest.name.startsWith("@dreamboard-games/")
    ) {
      fail(
        `${relativePath} declares unexpected SDK workspace package ${manifest.name}`,
      );
    }
  }
}

async function assertReleaseWorkflow() {
  const workflowPath = path.join(root, ".github/workflows/release-alpha.yml");
  const workflow = await readFile(workflowPath, "utf8");
  const relativePath = path.relative(root, workflowPath);
  if (/--filter\s+['"]\.\/packages\/\*['"]/.test(workflow)) {
    fail(`${relativePath} must not publish every package workspace`);
  }
  if (/\bpnpm\s+-r\b/.test(workflow) && /\bpublish\b/.test(workflow)) {
    fail(`${relativePath} must not use recursive publish`);
  }
  const publishesSdkWorkspace = workflow.includes(
    "--filter @dreamboard-games/sdk publish",
  );
  const publishesVerifiedTarball =
    workflow.includes("find package -name '*.tgz'") &&
    workflow.includes('npm publish "$sdk_tarball"') &&
    workflow.includes(`metadata.name !== "${publicPackageName}"`);
  if (!publishesSdkWorkspace && !publishesVerifiedTarball) {
    fail(
      `${relativePath} must publish only ${publicPackageName} or its verified tarball artifact`,
    );
  }
  for (const requiredFragment of [
    "pnpm verify:release",
    'npm view "$SDK_NAME@$SDK_VERSION" version',
    "candidate-receipt.json",
    'test "$PUBLISHED_INTEGRITY" = "$EXPECTED_INTEGRITY"',
  ]) {
    if (!workflow.includes(requiredFragment)) {
      fail(
        `${relativePath} must prove the immutable candidate with ${JSON.stringify(requiredFragment)}`,
      );
    }
  }
}

assertKnownPublicPackages();
await assertPackageManifests();
await assertReleaseWorkflow();

console.log(
  "SDK publication boundary OK: only @dreamboard-games/sdk is public",
);
