import { existsSync } from "node:fs";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

import {
  parseReferenceGameManifest,
  type ReferenceGameManifest,
} from "../../packages/sdk/src/reference-games/schema.ts";

export const SDK_PACKAGE_NAME = "@dreamboard-games/sdk";
export const EXACT_VERSION_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const dependencySections = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

export type PackageJson = {
  readonly name?: string;
  readonly version?: string;
  readonly scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
  readonly optionalDependencies?: Record<string, string>;
};

export type ReferenceGame = {
  readonly id: string;
  readonly dir: string;
  readonly manifestPath: string;
  readonly packageJsonPath: string;
  readonly lockfilePath: string;
  readonly manifest: ReferenceGameManifest;
  readonly packageJson: PackageJson;
};

export type DiscoverReferenceGamesOptions = {
  readonly root: string;
  readonly gameId?: string;
};

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function dependencyEntries(packageJson: PackageJson) {
  return dependencySections.flatMap((section) =>
    Object.entries(packageJson[section] ?? {}).map(([name, specifier]) => ({
      section,
      name,
      specifier,
    })),
  );
}

async function assertWorkspaceFile(
  gameDir: string,
  gameId: string,
  label: string,
  relativePath: string,
): Promise<void> {
  const root = await realpath(gameDir);
  const candidate = path.resolve(gameDir, relativePath);
  let resolved: string;
  try {
    resolved = await realpath(candidate);
  } catch {
    throw new Error(`${gameId}: missing ${label} ${relativePath}`);
  }
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${gameId}: ${label} must stay inside the game workspace`);
  }
  if (!(await stat(resolved)).isFile()) {
    throw new Error(
      `${gameId}: ${label} must identify a file: ${relativePath}`,
    );
  }
}

function validateDependencies(gameId: string, packageJson: PackageJson): void {
  const entries = dependencyEntries(packageJson);
  const sdkEntries = entries.filter(({ name }) => name === SDK_PACKAGE_NAME);
  if (
    sdkEntries.length !== 1 ||
    sdkEntries[0]?.section !== "dependencies" ||
    !EXACT_VERSION_PATTERN.test(sdkEntries[0].specifier)
  ) {
    throw new Error(
      `${gameId}: ${SDK_PACKAGE_NAME} must appear once in dependencies at one exact npm version`,
    );
  }

  for (const { section, name, specifier } of entries) {
    if (specifier.startsWith("catalog:")) {
      throw new Error(
        `${gameId}: ${section}.${name} must not use a pnpm catalog`,
      );
    }
    if (
      specifier.startsWith("workspace:") ||
      specifier.startsWith("link:") ||
      specifier.startsWith("file:")
    ) {
      throw new Error(
        `${gameId}: ${section}.${name} must not use a workspace-local specifier`,
      );
    }
    if (
      (name.startsWith("@dreamboard-games/") ||
        name.startsWith("@dreamboard/")) &&
      name !== SDK_PACKAGE_NAME
    ) {
      throw new Error(
        `${gameId}: ${section}.${name} is not a public SDK dependency`,
      );
    }
  }

  for (const script of [
    "generate",
    "typecheck:raw",
    "test:raw",
    "test:ui:raw",
  ]) {
    if (!packageJson.scripts?.[script]) {
      throw new Error(`${gameId}: package.json is missing scripts.${script}`);
    }
  }
}

async function loadReferenceGame(
  dir: string,
  id: string,
): Promise<ReferenceGame> {
  const manifestPath = path.join(dir, "reference-game.json");
  const packageJsonPath = path.join(dir, "package.json");
  const lockfilePath = path.join(dir, "pnpm-lock.yaml");
  for (const required of [
    manifestPath,
    packageJsonPath,
    lockfilePath,
    path.join(dir, "rule.md"),
  ]) {
    if (!existsSync(required)) {
      throw new Error(`${id}: missing ${path.relative(dir, required)}`);
    }
  }

  const manifest = parseReferenceGameManifest(await readJson(manifestPath));
  if (manifest.id !== id) {
    throw new Error(`${id}: reference-game.json id is ${manifest.id}`);
  }
  const packageJson = (await readJson(packageJsonPath)) as PackageJson;
  validateDependencies(id, packageJson);

  for (const [label, relativePath] of Object.entries(manifest.workspace)) {
    await assertWorkspaceFile(dir, id, `workspace.${label}`, relativePath);
  }
  for (const relativePath of manifest.teaching.readFirst) {
    await assertWorkspaceFile(dir, id, "teaching.readFirst", relativePath);
  }

  return {
    id,
    dir,
    manifestPath,
    packageJsonPath,
    lockfilePath,
    manifest,
    packageJson,
  };
}

export async function discoverReferenceGames(
  options: DiscoverReferenceGamesOptions,
): Promise<ReferenceGame[]> {
  const gamesRoot = path.join(options.root, "examples/reference-games");
  const entries = await readdir(gamesRoot, { withFileTypes: true });
  const ids = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(path.join(gamesRoot, entry.name, "reference-game.json")),
    )
    .map((entry) => entry.name)
    .sort();

  if (options.gameId && !ids.includes(options.gameId)) {
    throw new Error(
      `Unknown reference game '${options.gameId}'. Expected one of: ${ids.join(", ")}`,
    );
  }
  const selected = options.gameId ? [options.gameId] : ids;
  if (selected.length === 0) throw new Error("No reference games were found.");
  return Promise.all(
    selected.map((id) => loadReferenceGame(path.join(gamesRoot, id), id)),
  );
}

export function sdkDependencyVersion(game: ReferenceGame): string {
  const version = game.packageJson.dependencies?.[SDK_PACKAGE_NAME];
  if (!version) throw new Error(`${game.id}: missing ${SDK_PACKAGE_NAME}`);
  return version;
}
