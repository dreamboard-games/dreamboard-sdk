#!/usr/bin/env node
/* global console, process */
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildRoot,
  expectedReferenceGameIds,
  listReferenceGameDirs,
  pathExists,
  readJson,
  referenceGamesRoot,
  root,
  sha256File,
  writeJson,
} from "./reference-games-lib.mjs";

const sdkPackage = "@dreamboard-games/sdk";
const exactVersionPattern =
  /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?$/;
const localVersionPattern = /(?:^|[-.])local(?:[-.]|$)/i;

function fail(errors) {
  throw new Error(
    `Packageable reference game verification failed:\n\n${errors.map((error) => `- ${error}`).join("\n")}`,
  );
}

function parseArgs(argv) {
  const options = { games: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--game") {
      options.games.push(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }
  return options;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${options.cwd ?? root}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result;
}

function dependencyGroups(packageJson) {
  return [
    ["dependencies", packageJson.dependencies ?? {}],
    ["devDependencies", packageJson.devDependencies ?? {}],
    ["peerDependencies", packageJson.peerDependencies ?? {}],
    ["optionalDependencies", packageJson.optionalDependencies ?? {}],
  ];
}

function findSdkSpecifier(packageJson) {
  const matches = [];
  for (const [groupName, dependencies] of dependencyGroups(packageJson)) {
    if (Object.hasOwn(dependencies, sdkPackage)) {
      matches.push({
        groupName,
        specifier: dependencies[sdkPackage],
      });
    }
  }
  return matches;
}

function assertExactSdkSpecifier({
  gameId,
  packageJson,
  expectedSdkVersion,
  errors,
}) {
  const matches = findSdkSpecifier(packageJson);
  if (matches.length === 0) {
    errors.push(`${gameId}: missing ${sdkPackage} dependency`);
    return null;
  }
  if (matches.length > 1 || matches[0].groupName !== "dependencies") {
    errors.push(`${gameId}: ${sdkPackage} must appear only in dependencies`);
    return null;
  }

  const specifier = matches[0].specifier;
  if (
    typeof specifier !== "string" ||
    !exactVersionPattern.test(specifier) ||
    localVersionPattern.test(specifier)
  ) {
    errors.push(
      `${gameId}: dependencies.${sdkPackage} must be an exact public registry version, received ${JSON.stringify(specifier)}`,
    );
    return null;
  }
  if (specifier !== expectedSdkVersion) {
    errors.push(
      `${gameId}: dependencies.${sdkPackage} must match packages/sdk version ${expectedSdkVersion}, received ${specifier}`,
    );
    return null;
  }
  return specifier;
}

function extractLockfileResolution({
  gameId,
  lockfileText,
  expectedSpecifier,
  errors,
}) {
  const escapedSdkPackage = sdkPackage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedSpecifier = expectedSpecifier.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const importerDependencyPattern = new RegExp(
    String.raw`importers:\n(?:[\s\S]*?)  \.:\n(?:[\s\S]*?)      ["']${escapedSdkPackage}["']:\n        specifier: ([^\n]+)\n        version: ([^\n]+)`,
  );
  const importerMatch = lockfileText.match(importerDependencyPattern);
  if (!importerMatch) {
    errors.push(
      `${gameId}: pnpm-lock.yaml is missing importer entry for ${sdkPackage}`,
    );
    return null;
  }

  const lockfileSpecifier = importerMatch[1].trim().replace(/^["']|["']$/g, "");
  const resolvedVersion = importerMatch[2].trim().replace(/^["']|["']$/g, "");
  if (lockfileSpecifier !== expectedSpecifier) {
    errors.push(
      `${gameId}: lockfile ${sdkPackage} specifier ${lockfileSpecifier} does not match package.json ${expectedSpecifier}`,
    );
  }
  if (
    resolvedVersion !== expectedSpecifier &&
    !resolvedVersion.startsWith(`${expectedSpecifier}(`)
  ) {
    errors.push(
      `${gameId}: lockfile resolved ${sdkPackage} version ${resolvedVersion} does not match ${expectedSpecifier}`,
    );
  }

  const packageEntryPattern = new RegExp(
    String.raw`  ["']${escapedSdkPackage}@${escapedSpecifier}["']:\n    resolution:(?: \{integrity: ([^,}\n]+)[^}\n]*\}|\n      \{\n        integrity: ([^,\n]+),?\n      \})`,
  );
  const packageEntryMatch = lockfileText.match(packageEntryPattern);
  if (!packageEntryMatch) {
    errors.push(
      `${gameId}: pnpm-lock.yaml is missing ${sdkPackage}@${expectedSpecifier} package resolution with integrity`,
    );
    return {
      specifier: lockfileSpecifier,
      resolvedVersion,
      integrity: null,
    };
  }

  const integrity = (packageEntryMatch[1] ?? packageEntryMatch[2])
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!integrity.startsWith("sha512-")) {
    errors.push(
      `${gameId}: ${sdkPackage}@${expectedSpecifier} integrity must be sha512`,
    );
  }

  return {
    specifier: lockfileSpecifier,
    resolvedVersion,
    integrity,
  };
}

function isPackageableReferenceGameManifest(manifest) {
  return manifest.demoRelease !== undefined;
}

function validatePackageableCandidateManifest({ gameId, manifest, errors }) {
  if (manifest.schemaVersion !== 3) {
    errors.push(`${gameId}: reference-game.json schemaVersion must be 3`);
  }
  if (Object.hasOwn(manifest, "publishToDemoGallery")) {
    errors.push(`${gameId}: publishToDemoGallery is forbidden`);
  }
  if (Object.hasOwn(manifest, "releaseChannels")) {
    errors.push(
      `${gameId}: releaseChannels is product policy and is forbidden`,
    );
  }
  if (
    manifest.demoRelease !== undefined &&
    (manifest.demoRelease === null ||
      typeof manifest.demoRelease !== "object" ||
      Array.isArray(manifest.demoRelease))
  ) {
    errors.push(`${gameId}: demoRelease must be an object`);
  }
}

async function listPackageableDemos({ selectedGames, errors }) {
  const dirs = await listReferenceGameDirs();
  const selected = selectedGames.length > 0 ? new Set(selectedGames) : null;
  for (const gameId of selectedGames) {
    if (!expectedReferenceGameIds.includes(gameId)) {
      errors.push(
        `Unknown reference game '${gameId}'. Expected one of: ${expectedReferenceGameIds.join(", ")}`,
      );
    }
  }
  if (errors.length > 0) {
    return [];
  }

  const demos = [];
  for (const gameId of dirs.filter((id) =>
    expectedReferenceGameIds.includes(id),
  )) {
    if (selected && !selected.has(gameId)) {
      continue;
    }
    const manifestPath = path.join(
      referenceGamesRoot,
      gameId,
      "reference-game.json",
    );
    if (!(await pathExists(manifestPath))) {
      errors.push(`${gameId}: missing reference-game.json`);
      continue;
    }
    const manifest = await readJson(manifestPath);
    validatePackageableCandidateManifest({ gameId, manifest, errors });
    if (!isPackageableReferenceGameManifest(manifest)) {
      continue;
    }
    const sourcePath = gameId;
    const demoDir = path.join(referenceGamesRoot, gameId);
    demos.push({ gameId, demoDir, sourcePath });
  }
  if (selected) {
    const missingSelection = [...selected].filter(
      (gameId) => !demos.some((demo) => demo.gameId === gameId),
    );
    for (const gameId of missingSelection) {
      errors.push(
        `${gameId}: does not declare demoRelease packageability metadata`,
      );
    }
  }
  return demos;
}

async function validateDemoMetadata({
  gameId,
  demoDir,
  sourcePath,
  expectedSdkVersion,
  errors,
}) {
  const packagePath = path.join(demoDir, "package.json");
  const lockfilePath = path.join(demoDir, "pnpm-lock.yaml");
  if (!(await pathExists(packagePath))) {
    errors.push(`${gameId}: missing ${sourcePath}/package.json`);
    return null;
  }
  if (!(await pathExists(lockfilePath))) {
    errors.push(`${gameId}: missing ${sourcePath}/pnpm-lock.yaml`);
    return null;
  }

  const packageJson = await readJson(packagePath);
  const sdkSpecifier = assertExactSdkSpecifier({
    gameId,
    packageJson,
    expectedSdkVersion,
    errors,
  });
  const lockfileText = await import("node:fs/promises").then(({ readFile }) =>
    readFile(lockfilePath, "utf8"),
  );
  const sdkResolution = sdkSpecifier
    ? extractLockfileResolution({
        gameId,
        lockfileText,
        expectedSpecifier: sdkSpecifier,
        errors,
      })
    : null;

  if (!packageJson.scripts?.typecheck) {
    errors.push(`${gameId}: packageable demo must define a typecheck script`);
  }

  return {
    gameId,
    sourcePath,
    packageName: packageJson.name,
    sdkSpecifier,
    sdkResolution,
    lockfileSha256: await sha256File(lockfilePath),
    packageSha256: await sha256File(packagePath),
    checks: {
      frozenInstall: "pending",
      typecheck: packageJson.scripts?.typecheck ? "pending" : "missing",
      testUi: packageJson.scripts?.["test:ui"] ? "pending" : "skipped",
    },
  };
}

async function copyDemoToSandbox({ demoDir, gameId, tempRoot }) {
  const sandbox = path.join(tempRoot, gameId);
  await cp(demoDir, sandbox, {
    recursive: true,
    filter(source) {
      const name = path.basename(source);
      return name !== "node_modules" && name !== "dist" && name !== ".turbo";
    },
  });
  return sandbox;
}

async function runDemoChecks({ demo, tempRoot }) {
  const sandbox = await copyDemoToSandbox({
    demoDir: demo.demoDir,
    gameId: demo.gameId,
    tempRoot,
  });
  run(
    "pnpm",
    [
      "install",
      "--frozen-lockfile",
      "--ignore-workspace",
      "--config.shared-workspace-lockfile=false",
    ],
    { cwd: sandbox, stdio: "inherit" },
  );
  demo.receipt.checks.frozenInstall = "passed";

  run("pnpm", ["run", "typecheck"], { cwd: sandbox, stdio: "inherit" });
  demo.receipt.checks.typecheck = "passed";

  if (demo.receipt.checks.testUi !== "skipped") {
    run("pnpm", ["run", "test:ui"], { cwd: sandbox, stdio: "inherit" });
    demo.receipt.checks.testUi = "passed";
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const errors = [];
  const packageableDemos = await listPackageableDemos({
    selectedGames: options.games,
    errors,
  });
  if (packageableDemos.length === 0 && errors.length === 0) {
    errors.push(
      "no reference games declare demoRelease packageability metadata",
    );
  }

  const receipts = [];
  const demos = [];
  const sdkPackageJson = await readJson(
    path.join(root, "packages/sdk/package.json"),
  );
  for (const demo of packageableDemos) {
    const receipt = await validateDemoMetadata({
      ...demo,
      expectedSdkVersion: sdkPackageJson.version,
      errors,
    });
    if (receipt) {
      receipts.push(receipt);
      demos.push({ ...demo, receipt });
    }
  }
  if (errors.length > 0) {
    fail(errors);
  }

  const releaseSetIdentities = new Set(
    receipts.map((receipt) =>
      [
        receipt.sdkSpecifier,
        receipt.sdkResolution?.resolvedVersion,
        receipt.sdkResolution?.integrity,
      ].join("\n"),
    ),
  );
  if (releaseSetIdentities.size !== 1) {
    fail([
      `${sdkPackage}: packageable reference games must resolve one SDK version and integrity`,
      ...receipts.map(
        (receipt) =>
          `${receipt.gameId}: ${receipt.sdkSpecifier} -> ${receipt.sdkResolution?.resolvedVersion ?? "<missing>"} ${receipt.sdkResolution?.integrity ?? "<missing integrity>"}`,
      ),
    ]);
  }

  const tempRoot = await mkdtemp(
    path.join(tmpdir(), "dreamboard-packageable-reference-games-"),
  );
  try {
    for (const demo of demos) {
      await runDemoChecks({ demo, tempRoot });
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }

  const receipt = {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    sdkPackage,
    packageableReferenceGames: receipts,
  };
  await mkdir(buildRoot, { recursive: true });
  await writeJson(
    path.join(buildRoot, "packageable-demo-receipt.json"),
    receipt,
  );
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
