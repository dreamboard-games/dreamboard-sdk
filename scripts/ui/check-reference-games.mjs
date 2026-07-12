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

function checkDependencies({
  packageJson,
  gameId,
  expectedSdkVersion,
  errors,
}) {
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
  } else if (sdkVersion !== expectedSdkVersion) {
    errors.push(
      `${gameId}: dependencies.${sdkPackage} must match packages/sdk version ${expectedSdkVersion}, received ${sdkVersion}`,
    );
  }
}

async function checkWorkspacePath({ gameDir, gameId, label, value, errors }) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${gameId}: workspace.${label} must be a non-empty string`);
    return false;
  }
  if (path.isAbsolute(value) || value.includes("..")) {
    errors.push(`${gameId}: workspace.${label} must stay inside the game root`);
    return false;
  }
  if (!(await pathExists(path.join(gameDir, value)))) {
    errors.push(`${gameId}: missing workspace.${label} ${value}`);
    return false;
  }
  return true;
}

async function checkWorkspacePathList({
  gameDir,
  gameId,
  label,
  values,
  errors,
}) {
  if (!Array.isArray(values) || values.length === 0) {
    errors.push(`${gameId}: workspace.${label} must be a non-empty array`);
    return;
  }
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`${gameId}: duplicated workspace.${label} entry ${value}`);
    }
    seen.add(value);
    await checkWorkspacePath({ gameDir, gameId, label, value, errors });
  }
}

async function checkWorkspaceManifest({ manifest, gameId, gameDir, errors }) {
  const workspace = manifest.workspace;
  if (!workspace || typeof workspace !== "object") {
    errors.push(`${gameId}: schemaVersion 3 requires workspace`);
    return;
  }
  await checkWorkspacePath({
    gameDir,
    gameId,
    label: "manifest",
    value: workspace.manifest,
    errors,
  });
  await checkWorkspacePath({
    gameDir,
    gameId,
    label: "reducer",
    value: workspace.reducer,
    errors,
  });
  await checkWorkspacePath({
    gameDir,
    gameId,
    label: "ui",
    value: workspace.ui,
    errors,
  });
  await checkWorkspacePathList({
    gameDir,
    gameId,
    label: "behaviorScenarios",
    values: workspace.behaviorScenarios,
    errors,
  });
  await checkWorkspacePathList({
    gameDir,
    gameId,
    label: "uiScenarios",
    values: workspace.uiScenarios,
    errors,
  });

  const readFirst = manifest.teaching?.readFirst;
  if (!Array.isArray(readFirst) || readFirst.length === 0) {
    errors.push(`${gameId}: teaching.readFirst must be a non-empty array`);
  } else {
    for (const value of readFirst) {
      await checkWorkspacePath({
        gameDir,
        gameId,
        label: "teaching.readFirst",
        value,
        errors,
      });
    }
  }

  if (
    !Array.isArray(manifest.teaching?.whatThisTeaches) ||
    manifest.teaching.whatThisTeaches.length === 0
  ) {
    errors.push(
      `${gameId}: teaching.whatThisTeaches must be a non-empty array`,
    );
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkRequiredString({ value, label, gameId, errors }) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${gameId}: ${label} must be a non-empty string`);
  }
}

function checkPositiveInteger({ value, label, gameId, errors }) {
  if (!Number.isInteger(value) || value <= 0) {
    errors.push(`${gameId}: ${label} must be a positive integer`);
  }
}

function checkStringArray({ values, label, gameId, errors }) {
  if (!Array.isArray(values) || values.length === 0) {
    errors.push(`${gameId}: ${label} must be a non-empty array`);
    return;
  }
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) {
      errors.push(`${gameId}: ${label} entries must be non-empty strings`);
    }
  }
}

async function checkDemoReleaseV3({ manifest, gameId, gameDir, errors }) {
  if (Object.hasOwn(manifest, "publishToDemoGallery")) {
    errors.push(
      `${gameId}: publishToDemoGallery is forbidden in schemaVersion 3`,
    );
  }
  if (Object.hasOwn(manifest, "releaseChannels")) {
    errors.push(
      `${gameId}: releaseChannels is product policy and is forbidden`,
    );
  }

  if (manifest.demoRelease === undefined) {
    return;
  }
  const demoRelease = manifest.demoRelease;
  if (!isPlainObject(demoRelease)) {
    errors.push(`${gameId}: demoRelease must be an object`);
    return;
  }
  if (Object.hasOwn(demoRelease, "sourcePath")) {
    errors.push(`${gameId}: demoRelease.sourcePath is forbidden`);
  }
  if (Object.hasOwn(demoRelease, "heroImageUrl")) {
    errors.push(
      `${gameId}: demoRelease.heroImageUrl is obsolete and forbidden`,
    );
  }
  if (Object.hasOwn(demoRelease, "screenshot")) {
    errors.push(`${gameId}: demoRelease.screenshot is obsolete and forbidden`);
  }

  for (const field of [
    "slug",
    "name",
    "description",
    "overview",
    "creator",
    "thumbnailPath",
  ]) {
    checkRequiredString({
      value: demoRelease[field],
      label: `demoRelease.${field}`,
      gameId,
      errors,
    });
  }
  for (const field of [
    "minPlayers",
    "maxPlayers",
    "playTimeMinMinutes",
    "playTimeMaxMinutes",
    "estimatedMinutes",
    "demoPlayerCount",
  ]) {
    checkPositiveInteger({
      value: demoRelease[field],
      label: `demoRelease.${field}`,
      gameId,
      errors,
    });
  }
  if (
    !Number.isInteger(demoRelease.difficulty) ||
    demoRelease.difficulty < 1 ||
    demoRelease.difficulty > 5
  ) {
    errors.push(
      `${gameId}: demoRelease.difficulty must be an integer from 1 to 5`,
    );
  }
  if (
    Number.isInteger(demoRelease.minPlayers) &&
    Number.isInteger(demoRelease.maxPlayers) &&
    demoRelease.maxPlayers < demoRelease.minPlayers
  ) {
    errors.push(`${gameId}: demoRelease.maxPlayers must be >= minPlayers`);
  }
  if (
    Number.isInteger(demoRelease.playTimeMinMinutes) &&
    Number.isInteger(demoRelease.playTimeMaxMinutes) &&
    demoRelease.playTimeMaxMinutes < demoRelease.playTimeMinMinutes
  ) {
    errors.push(
      `${gameId}: demoRelease.playTimeMaxMinutes must be >= playTimeMinMinutes`,
    );
  }
  checkStringArray({
    values: demoRelease.mechanics,
    label: "demoRelease.mechanics",
    gameId,
    errors,
  });
  checkStringArray({
    values: demoRelease.categories,
    label: "demoRelease.categories",
    gameId,
    errors,
  });

  const thumbnailPath = demoRelease.thumbnailPath;
  const thumbnailSegments =
    typeof thumbnailPath === "string" ? thumbnailPath.split("/") : [];
  const safeThumbnailPath =
    typeof thumbnailPath === "string" &&
    thumbnailPath.startsWith("assets/") &&
    !path.isAbsolute(thumbnailPath) &&
    !thumbnailPath.includes("\\") &&
    thumbnailSegments.every(
      (segment) => segment.length > 0 && segment !== "." && segment !== "..",
    );
  if (!safeThumbnailPath) {
    errors.push(
      `${gameId}: demoRelease.thumbnailPath must stay inside the game assets directory`,
    );
    return;
  }
  if (!(await pathExists(path.join(gameDir, thumbnailPath)))) {
    errors.push(
      `${gameId}: missing demoRelease.thumbnailPath ${thumbnailPath}`,
    );
  }

  const licenseManifestPath = manifest.rights?.assetLicenseManifest;
  if (typeof licenseManifestPath !== "string") {
    return;
  }
  const absoluteLicenseManifestPath = path.join(gameDir, licenseManifestPath);
  if (!(await pathExists(absoluteLicenseManifestPath))) {
    errors.push(
      `${gameId}: missing rights.assetLicenseManifest ${licenseManifestPath}`,
    );
    return;
  }
  try {
    const licenseManifest = await readJson(absoluteLicenseManifestPath);
    const assetRelativePath = path.posix.relative("assets", thumbnailPath);
    const licenseEntry = Array.isArray(licenseManifest.assets)
      ? licenseManifest.assets.find(
          (entry) =>
            isPlainObject(entry) &&
            (entry.path === assetRelativePath || entry.path === thumbnailPath),
        )
      : undefined;
    if (!licenseEntry) {
      errors.push(
        `${gameId}: ${licenseManifestPath} must record ${assetRelativePath}`,
      );
    } else if (
      typeof licenseEntry.license !== "string" ||
      licenseEntry.license.length === 0 ||
      typeof licenseEntry.source !== "string" ||
      licenseEntry.source.length === 0
    ) {
      errors.push(
        `${gameId}: ${licenseManifestPath} thumbnail entry requires license and source`,
      );
    }
  } catch (error) {
    errors.push(
      `${gameId}: invalid rights.assetLicenseManifest ${licenseManifestPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
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
      ".dreamboard-dev",
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
      relative.startsWith(
        "docs/exec-plans/ui-primitive-coverage-and-agent-loop-hard-cut/",
      ) ||
      relative.startsWith(
        "docs/exec-plans/reference-game-teaching-source-and-admission-hard-cut/",
      ) ||
      relative.startsWith(
        "docs/exec-plans/competition-game-authoring-capability-hard-cut/",
      ) ||
      relative.startsWith(
        "docs/exec-plans/reference-game-rule-conformance-hard-cut/",
      ) ||
      relative === "docs/reference/canonical-examples.md" ||
      relative.startsWith("packages/sdk/src/reference-games/") ||
      relative.startsWith(
        "docs/capability-research/competition-game-authoring/",
      ) ||
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

async function validateGame(gameId, errors, expectedSdkVersion) {
  const gameDir = path.join(referenceGamesRoot, gameId);
  const packagePath = path.join(gameDir, "package.json");
  const lockfilePath = path.join(gameDir, "pnpm-lock.yaml");
  const manifestPath = path.join(gameDir, "reference-game.json");
  for (const requiredPath of [packagePath, lockfilePath, manifestPath]) {
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
  checkDependencies({ packageJson, gameId, expectedSdkVersion, errors });

  if (manifest.schemaVersion !== 3) {
    errors.push(`${gameId}: manifest schemaVersion must be 3`);
  }
  if (manifest.id !== gameId) {
    errors.push(
      `${gameId}: manifest id mismatch ${JSON.stringify(manifest.id)}`,
    );
  }
  await checkWorkspaceManifest({ manifest, gameId, gameDir, errors });
  await checkDemoReleaseV3({ manifest, gameId, gameDir, errors });
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
    sourceSha256: await sha256Directory(gameDir, {
      excludeDirs: new Set(["node_modules", "dist"]),
    }),
    scenarioSha256: await sha256Directory(path.join(gameDir, "test")),
    manifestSha256: await sha256File(manifestPath),
    sdkDependency: packageJson.dependencies?.[sdkPackage],
  };
}

async function checkLegacyFixtureSidecarInventory(errors) {
  const legacyGames = [];
  for (const gameId of await listReferenceGameDirs()) {
    if (gameId === "shared") {
      continue;
    }
    const gameDir = path.join(referenceGamesRoot, gameId);
    for (const marker of [
      "demo-workspace",
      "src/reference-game.mjs",
      "src/ui.mjs",
      "scenarios/coverage.json",
      "scenarios/verify.mjs",
    ]) {
      if (await pathExists(path.join(gameDir, marker))) {
        legacyGames.push(`${gameId}: ${marker}`);
        break;
      }
    }
  }

  for (const marker of legacyGames.sort()) {
    errors.push(`${marker} legacy fixture-sidecar source is forbidden`);
  }
}

async function main() {
  const requestedGameIds = [];
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--game") {
      requestedGameIds.push(args[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument '${args[index]}'.`);
  }
  const selectedGameIds =
    requestedGameIds.length > 0
      ? [...new Set(requestedGameIds)]
      : expectedReferenceGameIds;
  const unknownRequested = selectedGameIds.filter(
    (gameId) => !expectedReferenceGameIds.includes(gameId),
  );
  if (unknownRequested.length > 0) {
    throw new Error(`Unknown reference games: ${unknownRequested.join(", ")}.`);
  }
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
  await checkLegacyFixtureSidecarInventory(errors);

  const receipts = [];
  const sdkPackageJson = await readJson(
    path.join(root, "packages/sdk/package.json"),
  );
  for (const gameId of selectedGameIds) {
    if (gameDirs.includes(gameId)) {
      const receipt = await validateGame(
        gameId,
        errors,
        sdkPackageJson.version,
      );
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
