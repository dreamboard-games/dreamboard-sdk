import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import {
  REFERENCE_GAME_SOURCE_MANIFEST_SCHEMA_VERSION,
  parseReferenceGameManifestV4,
  parseReferenceGameSourceManifest,
  type ReferenceGameSourceManifest,
  type ReferenceGameSourceProvenance,
} from "./schema.js";
import {
  compareReferenceGameCanonicalStrings,
  computeReferenceGameSourceFingerprint,
} from "./canonical.js";
import {
  CANONICAL_REFERENCE_GAME_IDS,
  REFERENCE_GAME_SOURCE_INVENTORY_POLICY,
  isReferenceGameSourceObject,
  shouldDescendIntoReferenceGameDirectory,
} from "./source-inventory-policy.js";

export {
  CANONICAL_REFERENCE_GAME_IDS,
  REFERENCE_GAME_SOURCE_INVENTORY_POLICY,
  classifyReferenceGameSourcePath,
  isReferenceGameSourceObject,
  referenceGamePathIdentity,
  shouldDescendIntoReferenceGameDirectory,
  type ReferenceGameSourcePathClass,
} from "./source-inventory-policy.js";

export async function collectReferenceGameSourceManifest(options: {
  readonly sourceRoot: string;
  readonly provenance: ReferenceGameSourceProvenance;
}): Promise<ReferenceGameSourceManifest> {
  const sourceRoot = path.resolve(options.sourceRoot);
  const referenceGamesRoot = path.join(sourceRoot, "examples/reference-games");
  const gameIds = await listGameIds(referenceGamesRoot);
  if (gameIds.length === 0) {
    throw new Error("No reference-game packages were found.");
  }
  const objects = await collectReferenceGameSourceObjects({
    referenceGamesRoot,
    sourceRoot,
  });
  const games = await Promise.all(
    gameIds.map(async (gameId) => {
      const gameRoot = path.join(referenceGamesRoot, gameId);
      const metadata = parseReferenceGameManifestV4(
        await readJson(path.join(gameRoot, "reference-game.json")),
      );
      return buildGameEntry({
        gameId,
        gameRoot,
        sourceRoot,
        metadata,
        objects,
      });
    }),
  );
  const payload = {
    inventoryPolicy: {
      schemaVersion: REFERENCE_GAME_SOURCE_INVENTORY_POLICY.schemaVersion,
      workspaceOwnershipVersion:
        REFERENCE_GAME_SOURCE_INVENTORY_POLICY.workspaceOwnershipVersion,
      excludedGameRelativePaths: [
        ...REFERENCE_GAME_SOURCE_INVENTORY_POLICY.excludedGameRelativePaths,
      ],
      excludedGameRelativePrefixes: [
        ...REFERENCE_GAME_SOURCE_INVENTORY_POLICY.excludedGameRelativePrefixes,
      ],
    },
    games: games.sort((left, right) =>
      compareReferenceGameCanonicalStrings(left.id, right.id),
    ),
    objects: objects.sort((left, right) =>
      compareReferenceGameCanonicalStrings(left.path, right.path),
    ),
  };
  return parseReferenceGameSourceManifest({
    schemaVersion: REFERENCE_GAME_SOURCE_MANIFEST_SCHEMA_VERSION,
    manifestType: "dreamboard.reference-game-source",
    sourceFingerprint: computeReferenceGameSourceFingerprint(payload),
    payload,
    provenance: options.provenance,
  });
}

export async function collectReferenceGameSourceObjects(options: {
  readonly referenceGamesRoot: string;
  readonly sourceRoot: string;
}): Promise<
  Array<{
    readonly path: string;
    readonly sha256: string;
    readonly byteLength: number;
  }>
> {
  const files = await walkFiles(options.referenceGamesRoot, {
    shouldDescend: (directory) =>
      shouldDescendIntoReferenceGameDirectory(
        toPosix(path.relative(options.sourceRoot, directory)),
      ),
  });
  const objects = [];
  for (const relative of files) {
    const absolute = path.join(options.referenceGamesRoot, relative);
    const repositoryPath = toPosix(path.relative(options.sourceRoot, absolute));
    if (!isReferenceGameSourceObject(repositoryPath)) continue;
    const content = await readFile(absolute);
    objects.push({
      path: repositoryPath,
      sha256: `sha256:${sha256Buffer(content)}`,
      byteLength: content.length,
    });
  }
  return objects;
}

async function buildGameEntry(options: {
  readonly gameId: string;
  readonly gameRoot: string;
  readonly sourceRoot: string;
  readonly metadata: ReturnType<typeof parseReferenceGameManifestV4>;
  readonly objects: readonly {
    readonly path: string;
    readonly sha256: string;
    readonly byteLength: number;
  }[];
}) {
  const root = `examples/reference-games/${options.gameId}`;
  const workspace = options.metadata.workspace;
  const packageJsonPath = path.join(options.gameRoot, "package.json");
  const lockfilePath = path.join(options.gameRoot, "pnpm-lock.yaml");
  const packageJson = await readJson(packageJsonPath);
  const sdkSpecifier = findSdkSpecifier(packageJson);
  if (!sdkSpecifier) {
    throw new Error(`${root}/package.json must declare @dreamboard-games/sdk.`);
  }
  const mechanics = options.metadata.mechanics;
  if (mechanics.length === 0) {
    throw new Error(`${root}/reference-game.json must declare mechanics.`);
  }
  const teaching = options.metadata.teaching;
  const entry = {
    id: options.gameId,
    root,
    sourceSha256: sourceSha256ForGameObjects(options.objects, root),
    packageJsonSha256: `sha256:${await sha256File(packageJsonPath)}`,
    lockfileSha256: `sha256:${await sha256File(lockfilePath)}`,
    sdkSpecifier,
    manifest: await firstExistingRelative(options.gameRoot, [
      workspace.manifest,
      "manifest.ts",
      "reference-game.json",
    ]),
    reducer: await firstExistingRelative(options.gameRoot, [
      workspace.reducer,
      "app/game.ts",
    ]),
    ui: await firstExistingRelative(options.gameRoot, [
      workspace.ui,
      "ui/index.tsx",
    ]),
    behaviorScenarios: await collectScenarioEntries(
      options.gameRoot,
      "test/scenarios",
    ),
    uiScenarios: await collectScenarioEntries(
      options.gameRoot,
      "test/ui-scenarios",
    ),
    mechanics,
    readFirst:
      teaching.readFirst.length > 0
        ? teaching.readFirst
        : await deriveReadFirst(options.gameRoot, options.sourceRoot),
  };
  assertGameEntryPathsAreSourceObjects(entry, options.objects);
  return entry;
}

function assertGameEntryPathsAreSourceObjects(
  entry: {
    readonly root: string;
    readonly manifest: string;
    readonly reducer: string;
    readonly ui: string;
    readonly behaviorScenarios: readonly string[];
    readonly uiScenarios: readonly string[];
    readonly readFirst: readonly string[];
  },
  objects: readonly { readonly path: string }[],
): void {
  const objectPaths = new Set(
    objects.map(({ path: objectPath }) => objectPath),
  );
  const paths = [
    entry.manifest,
    entry.reducer,
    entry.ui,
    ...entry.behaviorScenarios,
    ...entry.uiScenarios,
    ...entry.readFirst,
  ];
  for (const relativePath of paths) {
    if (
      path.isAbsolute(relativePath) ||
      relativePath.split(/[\\/]+/u).includes("..")
    ) {
      throw new Error(
        `${entry.root} source entry must stay within the game root: ${relativePath}.`,
      );
    }
    const repositoryPath = path.posix.join(entry.root, toPosix(relativePath));
    if (!objectPaths.has(repositoryPath)) {
      throw new Error(
        `${entry.root} source entry is missing from the authored object inventory: ${relativePath}.`,
      );
    }
  }
}

async function listGameIds(referenceGamesRoot: string): Promise<string[]> {
  const entries = await readdir(referenceGamesRoot, { withFileTypes: true });
  const discovered: string[] = [];
  for (const entry of entries
    .filter(
      (entry) =>
        entry.isDirectory() && /^[a-z0-9][a-z0-9-]*$/u.test(entry.name),
    )
    .sort((left, right) =>
      compareReferenceGameCanonicalStrings(left.name, right.name),
    )) {
    if (
      await isFile(
        path.join(referenceGamesRoot, entry.name, "reference-game.json"),
      )
    ) {
      discovered.push(entry.name);
    }
  }
  const expected = [...CANONICAL_REFERENCE_GAME_IDS];
  const missing = expected.filter((gameId) => !discovered.includes(gameId));
  const extra = discovered.filter((gameId) => !expected.includes(gameId));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Reference-game identity mismatch (missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}).`,
    );
  }
  return expected;
}

async function deriveReadFirst(gameRoot: string, sourceRoot: string) {
  const candidates = [
    "README.md",
    "rule.md",
    "manifest.ts",
    "app/game.ts",
    "ui/index.tsx",
  ];
  const existing = [];
  for (const candidate of candidates) {
    if (await isFile(path.join(gameRoot, candidate))) existing.push(candidate);
  }
  if (existing.length === 0) {
    throw new Error(
      `${path.relative(sourceRoot, gameRoot)} must provide at least one readFirst file.`,
    );
  }
  return existing.slice(0, 5);
}

async function firstExistingRelative(root: string, candidates: unknown[]) {
  const paths = candidates.filter(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.length > 0,
  );
  for (const candidate of paths) {
    if (path.isAbsolute(candidate) || candidate.includes("..")) {
      throw new Error(`${candidate} must be a relative path within ${root}.`);
    }
    if (await isFile(path.join(root, candidate))) return candidate;
  }
  throw new Error(`${root} must provide one of: ${paths.join(", ")}`);
}

async function collectScenarioEntries(gameRoot: string, directory: string) {
  const absolute = path.join(gameRoot, directory);
  if (!(await isDirectory(absolute))) {
    throw new Error(`${gameRoot} must provide ${directory}.`);
  }
  const files: string[] = [];
  const rejectedDirectories = new Set([
    "build",
    "dist",
    "generated",
    "node_modules",
  ]);
  async function visit(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((left, right) =>
      compareReferenceGameCanonicalStrings(left.name, right.name),
    )) {
      const entryPath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`${entryPath} must not be a symbolic link.`);
      }
      if (entry.isDirectory()) {
        if (rejectedDirectories.has(entry.name)) {
          throw new Error(
            `${entryPath} is not an authored scenario directory.`,
          );
        }
        await visit(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".scenario.ts")) {
        files.push(
          path.posix.join(
            directory,
            toPosix(path.relative(absolute, entryPath)),
          ),
        );
      }
    }
  }
  await visit(absolute);
  if (files.length === 0) {
    throw new Error(
      `${gameRoot} must provide at least one ${directory}/**/*.scenario.ts entry.`,
    );
  }
  return files.sort(compareReferenceGameCanonicalStrings);
}

async function walkFiles(
  root: string,
  options: { readonly shouldDescend?: (directory: string) => boolean } = {},
): Promise<string[]> {
  const files: string[] = [];
  async function visit(current: string) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((left, right) =>
      compareReferenceGameCanonicalStrings(left.name, right.name),
    )) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!options.shouldDescend || options.shouldDescend(entryPath)) {
          await visit(entryPath);
        }
      } else if (entry.isFile()) {
        files.push(path.relative(root, entryPath));
      }
    }
  }
  await visit(root);
  return files.sort();
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
  const value = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${filePath} must contain a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function findSdkSpecifier(packageJson: Record<string, unknown>): string | null {
  for (const group of ["dependencies", "devDependencies", "peerDependencies"]) {
    const value = objectValue(packageJson[group])["@dreamboard-games/sdk"];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function sha256File(filePath: string): Promise<string> {
  return sha256Buffer(await readFile(filePath));
}

function sourceSha256ForGameObjects(
  objects: readonly {
    readonly path: string;
    readonly sha256: string;
    readonly byteLength: number;
  }[],
  gameRoot: string,
) {
  const hash = createHash("sha256");
  hash.update("reference-game-authored-objects@1\0");
  for (const object of objects
    .filter(({ path: objectPath }) => objectPath.startsWith(`${gameRoot}/`))
    .sort((left, right) =>
      compareReferenceGameCanonicalStrings(left.path, right.path),
    )) {
    hash.update(object.path.slice(gameRoot.length + 1));
    hash.update("\0");
    hash.update(object.sha256);
    hash.update("\0");
    hash.update(String(object.byteLength));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function sha256Buffer(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function isFile(filePath: string): Promise<boolean> {
  return stat(filePath)
    .then((value) => value.isFile())
    .catch((error: unknown) => {
      if (isMissingPathError(error)) return false;
      throw error;
    });
}

async function isDirectory(filePath: string): Promise<boolean> {
  return stat(filePath)
    .then((value) => value.isDirectory())
    .catch((error: unknown) => {
      if (isMissingPathError(error)) return false;
      throw error;
    });
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { readonly code?: unknown }).code === "ENOENT"
  );
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}
