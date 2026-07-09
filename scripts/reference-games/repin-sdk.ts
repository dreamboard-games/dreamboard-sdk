#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const sdkPackage = "@dreamboard-games/sdk";
const publicNpmRegistry = "https://registry.npmjs.org/";
const root = path.resolve(import.meta.dirname, "../..");
const referenceGamesRoot = path.join(root, "examples/reference-games");
const exactVersionPattern =
  /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?$/;
const localVersionPattern = /(?:^|[-.])local(?:[-.]|$)/i;

type PackageJson = {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

type NpmVersionMetadata = {
  name?: string;
  version?: string;
  dist?: {
    integrity?: string;
    tarball?: string;
  };
};

type Options = {
  check: boolean;
  dryRun: boolean;
  version?: string;
};

type ReferenceGame = {
  id: string;
  dir: string;
  packageJsonPath: string;
  lockfilePath: string;
};

function usage(): string {
  return `
Usage: pnpm reference-games:repin [version] [--check] [--dry-run]

Repin examples/reference-games/* package.json and pnpm-lock.yaml files to one
exact public @dreamboard-games/sdk version.

When version is omitted, the command uses packages/sdk/package.json.
`.trim();
}

function parseArgs(argv: string[]): Options {
  const options: Options = { check: false, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--check") {
      options.check = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown argument '${arg}'.\n\n${usage()}`);
    }
    if (options.version) {
      throw new Error(`Unexpected extra version '${arg}'.\n\n${usage()}`);
    }
    options.version = arg;
  }
  return options;
}

function requireExactPublicVersion(version: string): void {
  if (!exactVersionPattern.test(version) || localVersionPattern.test(version)) {
    throw new Error(
      `${sdkPackage} version must be one exact public npm version, received ${JSON.stringify(version)}.`,
    );
  }
}

async function resolveTargetVersion(version?: string): Promise<string> {
  const target =
    version ??
    (
      JSON.parse(
        await readFile(path.join(root, "packages/sdk/package.json"), "utf8"),
      ) as PackageJson
    ).version;
  if (!target) {
    throw new Error("packages/sdk/package.json is missing version.");
  }
  requireExactPublicVersion(target);
  return target;
}

async function fetchPublicSdkMetadata(
  version: string,
): Promise<NpmVersionMetadata> {
  const response = await fetch(
    `${publicNpmRegistry}${sdkPackage.replace("/", "%2F")}/${version}`,
  );
  if (!response.ok) {
    throw new Error(
      `${sdkPackage}@${version} is not available on public npm (${response.status} ${response.statusText}). Publish it before repinning reference games.`,
    );
  }
  const metadata = (await response.json()) as NpmVersionMetadata;
  if (metadata.name !== sdkPackage || metadata.version !== version) {
    throw new Error(
      `Public npm metadata mismatch: expected ${sdkPackage}@${version}, received ${metadata.name ?? "<missing>"}@${metadata.version ?? "<missing>"}.`,
    );
  }
  if (!metadata.dist?.integrity?.startsWith("sha512-")) {
    throw new Error(`${sdkPackage}@${version} is missing dist.integrity.`);
  }
  if (!metadata.dist.tarball?.startsWith(publicNpmRegistry)) {
    throw new Error(`${sdkPackage}@${version} tarball is not on public npm.`);
  }
  return metadata;
}

async function listReferenceGames(): Promise<ReferenceGame[]> {
  const entries = await readdir(referenceGamesRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(referenceGamesRoot, entry.name);
      return {
        id: entry.name,
        dir,
        packageJsonPath: path.join(dir, "package.json"),
        lockfilePath: path.join(dir, "pnpm-lock.yaml"),
      };
    })
    .filter((game) => existsSync(game.packageJsonPath))
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function readJson(filePath: string): Promise<PackageJson> {
  return JSON.parse(await readFile(filePath, "utf8")) as PackageJson;
}

async function writeJson(filePath: string, value: PackageJson): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sdkDependencyLocations(packageJson: PackageJson): Array<{
  section: keyof PackageJson;
  version: string;
}> {
  return ([
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ] as const).flatMap((section) => {
    const dependencies = packageJson[section];
    const version = dependencies?.[sdkPackage];
    return typeof version === "string" ? [{ section, version }] : [];
  });
}

function updatePackageJson({
  game,
  packageJson,
  version,
}: {
  game: ReferenceGame;
  packageJson: PackageJson;
  version: string;
}): boolean {
  const locations = sdkDependencyLocations(packageJson);
  if (locations.length === 0) {
    throw new Error(`${game.id}: package.json is missing ${sdkPackage}.`);
  }
  if (locations.length > 1 || locations[0].section !== "dependencies") {
    throw new Error(
      `${game.id}: ${sdkPackage} must appear only in dependencies.`,
    );
  }
  packageJson.dependencies ??= {};
  const current = packageJson.dependencies[sdkPackage];
  packageJson.dependencies[sdkPackage] = version;
  return current !== version;
}

function runPnpmInstall(game: ReferenceGame, npmrcPath: string): void {
  const result = spawnSync(
    "pnpm",
    [
      "--dir",
      game.dir,
      "install",
      "--ignore-workspace",
      "--no-frozen-lockfile",
      "--config.shared-workspace-lockfile=false",
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: "inherit",
      env: {
        ...process.env,
        CI: "true",
        NPM_CONFIG_USERCONFIG: npmrcPath,
      },
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `pnpm install failed for ${path.relative(root, game.dir)} with exit code ${result.status ?? 1}.`,
    );
  }
}

function extractLockfileSdkIdentity(lockfileText: string, version: string): {
  importerSpecifier?: string;
  importerVersion?: string;
  integrity?: string;
} {
  const escapedPackage = sdkPackage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const importerMatch = lockfileText.match(
    new RegExp(
      String.raw`importers:\n(?:[\s\S]*?)  \.:\n(?:[\s\S]*?)      ["']${escapedPackage}["']:\n        specifier: ([^\n]+)\n        version: ([^\n]+)`,
    ),
  );
  const packageEntryMatch = lockfileText.match(
    new RegExp(
      String.raw`  ["']${escapedPackage}@${escapedVersion}["']:\n    resolution:(?: \{integrity: ([^,}\n]+)[^}\n]*\}|\n      \{\n        integrity: ([^,\n]+),?\n      \})`,
    ),
  );
  return {
    importerSpecifier: importerMatch?.[1]?.trim().replace(/^["']|["']$/g, ""),
    importerVersion: importerMatch?.[2]?.trim().replace(/^["']|["']$/g, ""),
    integrity: (packageEntryMatch?.[1] ?? packageEntryMatch?.[2])
      ?.trim()
      .replace(/^["']|["']$/g, ""),
  };
}

async function validateGame({
  game,
  version,
  npmIntegrity,
}: {
  game: ReferenceGame;
  version: string;
  npmIntegrity: string;
}): Promise<string[]> {
  const errors: string[] = [];
  const packageJson = await readJson(game.packageJsonPath);
  const locations = sdkDependencyLocations(packageJson);
  if (locations.length !== 1 || locations[0].section !== "dependencies") {
    errors.push(`${game.id}: ${sdkPackage} must appear only in dependencies`);
  } else if (locations[0].version !== version) {
    errors.push(
      `${game.id}: package.json pins ${sdkPackage}@${locations[0].version}, expected ${version}`,
    );
  }

  const lockfileText = await readFile(game.lockfilePath, "utf8");
  const identity = extractLockfileSdkIdentity(lockfileText, version);
  if (identity.importerSpecifier !== version) {
    errors.push(
      `${game.id}: lockfile importer specifier is ${identity.importerSpecifier ?? "<missing>"}, expected ${version}`,
    );
  }
  if (
    identity.importerVersion !== version &&
    !identity.importerVersion?.startsWith(`${version}(`)
  ) {
    errors.push(
      `${game.id}: lockfile importer version is ${identity.importerVersion ?? "<missing>"}, expected ${version}`,
    );
  }
  if (identity.integrity !== npmIntegrity) {
    errors.push(
      `${game.id}: lockfile integrity is ${identity.integrity ?? "<missing>"}, expected public npm ${npmIntegrity}`,
    );
  }
  return errors;
}

async function validateAll({
  games,
  version,
  npmIntegrity,
}: {
  games: ReferenceGame[];
  version: string;
  npmIntegrity: string;
}): Promise<void> {
  const errors = (
    await Promise.all(
      games.map((game) => validateGame({ game, version, npmIntegrity })),
    )
  ).flat();
  if (errors.length > 0) {
    throw new Error(
      `Reference game SDK repin validation failed:\n\n${errors.map((error) => `- ${error}`).join("\n")}`,
    );
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const version = await resolveTargetVersion(options.version);
  const metadata = await fetchPublicSdkMetadata(version);
  const games = await listReferenceGames();
  const relativeGameDirs = games.map((game) => path.relative(root, game.dir));

  if (options.check) {
    await validateAll({
      games,
      version,
      npmIntegrity: metadata.dist?.integrity ?? "",
    });
    console.log(
      `Reference games already pin ${sdkPackage}@${version} with public npm integrity ${metadata.dist?.integrity}.`,
    );
    return;
  }

  console.log(
    `Repinning ${relativeGameDirs.length} reference games to ${sdkPackage}@${version}`,
  );
  console.log(`Public npm integrity: ${metadata.dist?.integrity}`);
  console.log(`Public npm tarball: ${metadata.dist?.tarball}`);

  let changedPackageJsonCount = 0;
  for (const game of games) {
    const packageJson = await readJson(game.packageJsonPath);
    if (updatePackageJson({ game, packageJson, version })) {
      changedPackageJsonCount += 1;
      console.log(`  package.json ${path.relative(root, game.packageJsonPath)}`);
      if (!options.dryRun) {
        await writeJson(game.packageJsonPath, packageJson);
      }
    }
  }

  if (options.dryRun) {
    console.log(
      `Dry run complete. ${changedPackageJsonCount} package.json file(s) would change; lockfiles were not refreshed.`,
    );
    return;
  }

  const tempDir = mkdtempSync(path.join(tmpdir(), "dreamboard-sdk-repin-"));
  const npmrcPath = path.join(tempDir, ".npmrc");
  writeFileSync(
    npmrcPath,
    [
      `registry=${publicNpmRegistry}`,
      `@dreamboard-games:registry=${publicNpmRegistry}`,
      "",
    ].join("\n"),
    "utf8",
  );
  try {
    for (const game of games) {
      console.log(`  lockfile ${path.relative(root, game.lockfilePath)}`);
      runPnpmInstall(game, npmrcPath);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  await validateAll({
    games,
    version,
    npmIntegrity: metadata.dist?.integrity ?? "",
  });
  console.log(`Reference games repinned to ${sdkPackage}@${version}.`);
  console.log("Next: pnpm reference-games:verify-publishable");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
