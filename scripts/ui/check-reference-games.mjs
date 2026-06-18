#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  commercialMarkDenylist,
  expectedReferenceGameIds,
  knownMechanics,
  knownUiPatterns,
  listReferenceGameDirs,
  pathExists,
  readJson,
  referenceGamesRoot,
  root,
  sha256Directory,
  sha256File,
  walkFiles,
} from "./reference-games-lib.mjs";

const sdkPackage = "@dreamboard-games/sdk";
const exactVersionPattern = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;

function fail(errors) {
  throw new Error(
    `Reference game validation failed:\n\n${errors.map((error) => `- ${error}`).join("\n")}`,
  );
}

function isUnsafeDependencySpecifier(value) {
  return (
    value.startsWith("workspace:") ||
    value.startsWith("link:") ||
    value.startsWith("file:") ||
    value.includes("../") ||
    value.includes("..\\")
  );
}

function checkArraySubset({ values, allowed, label, errors, gameId }) {
  if (!Array.isArray(values) || values.length === 0) {
    errors.push(`${gameId}: ${label} must be a non-empty array`);
    return;
  }
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string" || !allowed.has(value)) {
      errors.push(
        `${gameId}: unrecognized ${label} tag ${JSON.stringify(value)}`,
      );
    }
    if (seen.has(value)) {
      errors.push(`${gameId}: duplicated ${label} tag ${value}`);
    }
    seen.add(value);
  }
}

function checkDependencies({ packageJson, gameId, errors }) {
  const dependencyGroups = [
    ["dependencies", packageJson.dependencies ?? {}],
    ["devDependencies", packageJson.devDependencies ?? {}],
    ["peerDependencies", packageJson.peerDependencies ?? {}],
    ["optionalDependencies", packageJson.optionalDependencies ?? {}],
  ];
  for (const [groupName, dependencies] of dependencyGroups) {
    for (const [name, version] of Object.entries(dependencies)) {
      if (isUnsafeDependencySpecifier(version)) {
        errors.push(`${gameId}: ${groupName}.${name} uses ${version}`);
      }
      if (name.startsWith("@dreamboard-games/") && name !== sdkPackage) {
        errors.push(
          `${gameId}: ${groupName}.${name} is an internal SDK package`,
        );
      }
    }
  }

  const sdkVersion = packageJson.dependencies?.[sdkPackage];
  if (!sdkVersion) {
    errors.push(`${gameId}: missing dependencies.${sdkPackage}`);
  } else if (!exactVersionPattern.test(sdkVersion)) {
    errors.push(
      `${gameId}: dependencies.${sdkPackage} must be exact, received ${sdkVersion}`,
    );
  }
}

async function checkDemoRelease({ manifest, gameId, gameDir, errors }) {
  if (typeof manifest.publishToDemoGallery !== "boolean") {
    errors.push(`${gameId}: publishToDemoGallery must be a boolean`);
    return;
  }
  if (!manifest.publishToDemoGallery) {
    if (manifest.demoRelease !== undefined) {
      errors.push(`${gameId}: demoRelease requires publishToDemoGallery true`);
    }
    return;
  }

  const demoRelease = manifest.demoRelease;
  if (!demoRelease || typeof demoRelease !== "object") {
    errors.push(`${gameId}: published demo requires demoRelease`);
    return;
  }

  const expectedSourcePath = `${gameId}/demo-workspace`;
  if (demoRelease.sourcePath !== expectedSourcePath) {
    errors.push(
      `${gameId}: demoRelease.sourcePath must be ${expectedSourcePath}`,
    );
  }
  if (!(await pathExists(path.join(referenceGamesRoot, expectedSourcePath)))) {
    errors.push(`${gameId}: missing ${expectedSourcePath}`);
  }

  if (demoRelease.slug !== gameId) {
    errors.push(`${gameId}: demoRelease.slug must match game id`);
  }
  if (
    typeof demoRelease.heroImageUrl !== "string" ||
    !demoRelease.heroImageUrl.startsWith(`/demos/${gameId}/`)
  ) {
    errors.push(`${gameId}: demoRelease.heroImageUrl must be under /demos/${gameId}/`);
  }
  if (
    demoRelease.screenshot?.projection !==
    `${gameId}/demo-workspace/ui/index.tsx`
  ) {
    errors.push(
      `${gameId}: demoRelease.screenshot.projection must target demo-workspace/ui/index.tsx`,
    );
  }
  if (
    typeof demoRelease.demoPlayerCount !== "number" ||
    demoRelease.demoPlayerCount < 1
  ) {
    errors.push(`${gameId}: demoRelease.demoPlayerCount must be positive`);
  }
}

async function checkDenylist({ gameId, gameDir, errors }) {
  const files = await walkFiles(gameDir, {
    excludeDirs: new Set(["node_modules", "dist"]),
  });
  for (const relative of files) {
    const lower = (
      await readFile(path.join(gameDir, relative), "utf8")
    ).toLowerCase();
    for (const mark of commercialMarkDenylist) {
      if (lower.includes(mark)) {
        errors.push(
          `${gameId}: ${relative} contains denied commercial mark ${JSON.stringify(mark)}`,
        );
      }
    }
  }
}

async function checkDemoRegistryAbsence({ gameId, errors }) {
  const repoFiles = await walkFiles(root, {
    excludeDirs: new Set([
      ".git",
      ".turbo",
      "build",
      "dist",
      "node_modules",
      "test-results",
    ]),
  });
  const forbiddenSourcePath = `examples/reference-games/${gameId}`;
  const unexpectedFiles = [];
  for (const relative of repoFiles) {
    if (
      relative.startsWith("docs/exec-plans/ui-agent-iteration-workbench/") ||
      relative.startsWith("docs/exec-plans/ui-primitive-coverage-and-agent-loop-hard-cut/") ||
      relative.startsWith("fixtures/ui/reference-games/") ||
      relative.startsWith("artifacts/ui/") ||
      relative === "fixtures/ui/component-scenario-index.json" ||
      relative === "scripts/ui-fixtures/authority/authority.test.mjs" ||
      relative === "scripts/ui/generate-component-scenario-index.mjs" ||
      relative.startsWith("examples/reference-games/")
    ) {
      continue;
    }
    const text = await readFile(path.join(root, relative), "utf8");
    if (text.includes(forbiddenSourcePath)) {
      unexpectedFiles.push(relative);
    }
  }
  if (unexpectedFiles.length > 0) {
    errors.push(
      `${gameId}: reference game path appears outside reference/docs scope: ${unexpectedFiles.join(", ")}`,
    );
  }
}

async function validateGame(gameId, errors) {
  const gameDir = path.join(referenceGamesRoot, gameId);
  const packagePath = path.join(gameDir, "package.json");
  const lockfilePath = path.join(gameDir, "pnpm-lock.yaml");
  const manifestPath = path.join(gameDir, "reference-game.json");
  const srcPath = path.join(gameDir, "src/reference-game.mjs");
  const scenarioPath = path.join(gameDir, "scenarios/coverage.json");
  const testPath = path.join(gameDir, "scenarios/verify.mjs");

  for (const requiredPath of [
    packagePath,
    lockfilePath,
    manifestPath,
    srcPath,
    scenarioPath,
    testPath,
  ]) {
    if (!(await pathExists(requiredPath))) {
      errors.push(`${gameId}: missing ${path.relative(root, requiredPath)}`);
    }
  }
  if (!(await pathExists(packagePath)) || !(await pathExists(manifestPath))) {
    return;
  }

  const packageJson = await readJson(packagePath);
  const manifest = await readJson(manifestPath);
  if (packageJson.private !== true) {
    errors.push(`${gameId}: package.json must set private true`);
  }
  if (packageJson.name !== `@dreamboard-reference/${gameId}`) {
    errors.push(
      `${gameId}: package name must be @dreamboard-reference/${gameId}`,
    );
  }
  if (packageJson.scripts?.build !== "node src/reference-game.mjs") {
    errors.push(`${gameId}: build script must run node src/reference-game.mjs`);
  }
  if (packageJson.scripts?.test !== "node scenarios/verify.mjs") {
    errors.push(`${gameId}: test script must run node scenarios/verify.mjs`);
  }
  checkDependencies({ packageJson, gameId, errors });

  if (manifest.schemaVersion !== 1) {
    errors.push(`${gameId}: manifest schemaVersion must be 1`);
  }
  if (manifest.id !== gameId) {
    errors.push(
      `${gameId}: manifest id mismatch ${JSON.stringify(manifest.id)}`,
    );
  }
  await checkDemoRelease({ manifest, gameId, gameDir, errors });
  checkArraySubset({
    values: manifest.mechanics,
    allowed: knownMechanics,
    label: "mechanics",
    errors,
    gameId,
  });
  checkArraySubset({
    values: manifest.uiPatterns,
    allowed: knownUiPatterns,
    label: "uiPatterns",
    errors,
    gameId,
  });

  const rights = manifest.rights ?? {};
  if (rights.reviewStatus !== "approved") {
    errors.push(`${gameId}: rights.reviewStatus must be approved`);
  }
  if (!rights.reviewedBy || !rights.reviewedAt) {
    errors.push(`${gameId}: rights review metadata is incomplete`);
  }
  if (
    !Array.isArray(rights.thirdPartyMarks) ||
    rights.thirdPartyMarks.length !== 0
  ) {
    errors.push(`${gameId}: rights.thirdPartyMarks must be empty`);
  }
  if (
    manifest.sdk?.dependency !== sdkPackage ||
    manifest.sdk?.versionPolicy !== "exact"
  ) {
    errors.push(`${gameId}: sdk manifest policy must be ${sdkPackage} exact`);
  }

  await checkDenylist({ gameId, gameDir, errors });
  await checkDemoRegistryAbsence({ gameId, errors });

  return {
    id: gameId,
    packageSha256: await sha256File(packagePath),
    lockfileSha256: await sha256File(lockfilePath),
    sourceSha256: await sha256Directory(path.join(gameDir, "src")),
    scenarioSha256: await sha256Directory(path.join(gameDir, "scenarios")),
    manifestSha256: await sha256File(manifestPath),
    sdkDependency: packageJson.dependencies?.[sdkPackage],
  };
}

async function main() {
  const errors = [];
  if (!(await pathExists(referenceGamesRoot))) {
    fail([`missing ${path.relative(root, referenceGamesRoot)}`]);
  }
  const dirs = await listReferenceGameDirs();
  const infrastructureDirs = new Set(["shared"]);
  const gameDirs = dirs.filter((id) => !infrastructureDirs.has(id));
  const unexpected = gameDirs.filter(
    (id) => !expectedReferenceGameIds.includes(id),
  );
  const missing = expectedReferenceGameIds.filter(
    (id) => !gameDirs.includes(id),
  );
  if (unexpected.length > 0) {
    errors.push(
      `unexpected reference game directories: ${unexpected.join(", ")}`,
    );
  }
  if (missing.length > 0) {
    errors.push(`missing reference game directories: ${missing.join(", ")}`);
  }
  if (new Set(gameDirs).size !== gameDirs.length) {
    errors.push("duplicated reference game IDs");
  }

  const receipts = [];
  for (const gameId of expectedReferenceGameIds) {
    if (gameDirs.includes(gameId)) {
      const receipt = await validateGame(gameId, errors);
      if (receipt) {
        receipts.push(receipt);
      }
    }
  }
  if (errors.length > 0) {
    fail(errors);
  }

  console.log(
    JSON.stringify(
      {
        status: "passed",
        checkedAt: new Date().toISOString(),
        referenceGames: receipts,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
