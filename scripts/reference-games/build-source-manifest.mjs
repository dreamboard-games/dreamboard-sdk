import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  expectedReferenceGameIds,
  pathExists,
  readJson,
} from "../ui/reference-games-lib.mjs";

const excludedDirectoryNames = new Set([
  ".dreamboard",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

export async function buildReferenceGameSourceManifest({
  sourceRoot,
  provenance,
}) {
  const contract = await loadReferenceGameContract();
  const referenceGamesRoot = path.join(sourceRoot, "examples/reference-games");
  const objects = await collectSourceObjects(referenceGamesRoot, sourceRoot);
  const games = [];

  for (const gameId of expectedReferenceGameIds) {
    const gameRoot = path.join(referenceGamesRoot, gameId);
    const metadata = await readJson(path.join(gameRoot, "reference-game.json"));
    games.push(
      await buildGameEntry({
        gameId,
        gameRoot,
        sourceRoot,
        metadata,
      }),
    );
  }

  const payload = {
    games: games.sort((left, right) => left.id.localeCompare(right.id)),
    objects: objects.sort((left, right) => left.path.localeCompare(right.path)),
  };
  const bundleDigest = contract.computeReferenceGameSourceDigest(payload);
  return contract.parseReferenceGameSourceManifest({
    schemaVersion: contract.REFERENCE_GAME_SOURCE_MANIFEST_SCHEMA_VERSION,
    manifestType: "dreamboard.reference-game-source",
    bundleDigest,
    payload,
    provenance,
  });
}

async function loadReferenceGameContract() {
  const modulePath = path.resolve(
    import.meta.dirname,
    "../../packages/sdk/dist/reference-games/index.js",
  );
  if (!(await pathExists(modulePath))) {
    throw new Error(
      "packages/sdk/dist/reference-games/index.js is missing; run `pnpm --filter @dreamboard-games/sdk build` first.",
    );
  }
  return import(pathToFileURL(modulePath).href);
}

async function buildGameEntry({ gameId, gameRoot, sourceRoot, metadata }) {
  const root = `examples/reference-games/${gameId}`;
  const workspace = metadata.workspace ?? {};
  const packageJsonPath = path.join(gameRoot, "package.json");
  const lockfilePath = path.join(gameRoot, "pnpm-lock.yaml");
  const packageJson = await readJson(packageJsonPath);
  const sdkSpecifier =
    packageJson.dependencies?.["@dreamboard-games/sdk"] ??
    packageJson.devDependencies?.["@dreamboard-games/sdk"] ??
    packageJson.peerDependencies?.["@dreamboard-games/sdk"];
  if (typeof sdkSpecifier !== "string" || sdkSpecifier.length === 0) {
    throw new Error(`${root}/package.json must declare @dreamboard-games/sdk.`);
  }

  return {
    id: gameId,
    root,
    sourceSha256: `sha256:${await sha256Directory(gameRoot)}`,
    packageJsonSha256: `sha256:${await sha256File(packageJsonPath)}`,
    lockfileSha256: `sha256:${await sha256File(lockfilePath)}`,
    sdkSpecifier,
    manifest: await firstExistingRelative(gameRoot, [
      workspace.manifest,
      "manifest.ts",
      "reference-game.json",
    ]),
    reducer: await firstExistingRelative(gameRoot, [
      workspace.reducer,
      "app/game.ts",
    ]),
    ui: await firstExistingRelative(gameRoot, [workspace.ui, "ui/index.tsx"]),
    behaviorScenarios:
      workspace.behaviorScenarios ??
      (await collectScenarioEntries(gameRoot, ["test/scenarios"])),
    uiScenarios:
      workspace.uiScenarios ??
      (await collectScenarioEntries(gameRoot, ["test/ui-scenarios"])),
    mechanics: metadata.mechanics,
    readFirst:
      metadata.teaching?.readFirst ??
      (await deriveReadFirst(gameRoot, metadata, sourceRoot)),
    publishToDemoGallery: metadata.publishToDemoGallery === true,
  };
}

async function deriveReadFirst(gameRoot, metadata, sourceRoot) {
  const candidates = [
    "README.md",
    "rule.md",
    "manifest.ts",
    "app/game.ts",
    "ui/index.tsx",
  ];
  const existing = [];
  for (const candidate of candidates) {
    if (await pathExists(path.join(gameRoot, candidate))) {
      existing.push(candidate);
    }
  }
  if (existing.length === 0) {
    throw new Error(
      `${path.relative(sourceRoot, gameRoot)} must provide at least one readFirst file.`,
    );
  }
  return existing.slice(0, Math.max(3, metadata.publishToDemoGallery ? 5 : 3));
}

async function firstExistingRelative(root, candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    if (path.isAbsolute(candidate) || candidate.includes("..")) {
      throw new Error(`${candidate} must be a relative path within ${root}.`);
    }
    if (await pathExists(path.join(root, candidate))) {
      return candidate;
    }
  }
  throw new Error(
    `${root} must provide one of: ${candidates.filter(Boolean).join(", ")}`,
  );
}

async function collectScenarioEntries(gameRoot, directories) {
  for (const directory of directories) {
    const absolute = path.join(gameRoot, directory);
    if (!(await pathExists(absolute))) {
      continue;
    }
    const files = (await walkFiles(absolute))
      .filter(
        (relative) =>
          relative.endsWith(".scenario.ts") ||
          relative.endsWith(".scenario.mjs"),
      )
      .map((relative) => path.posix.join(directory, toPosix(relative)));
    if (files.length > 0) {
      return files;
    }
  }
  throw new Error(`${gameRoot} must provide at least one scenario entry.`);
}

async function collectSourceObjects(referenceGamesRoot, sourceRoot) {
  const files = await walkFiles(referenceGamesRoot);
  const objects = [];
  for (const relative of files) {
    const absolute = path.join(referenceGamesRoot, relative);
    const content = await readFile(absolute);
    objects.push({
      path: toPosix(path.relative(sourceRoot, absolute)),
      sha256: `sha256:${sha256Buffer(content)}`,
      byteLength: content.length,
    });
  }
  return objects;
}

async function walkFiles(root) {
  const files = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!excludedDirectoryNames.has(entry.name)) {
          await visit(path.join(current, entry.name));
        }
        continue;
      }
      if (entry.isFile()) {
        files.push(path.relative(root, path.join(current, entry.name)));
      }
    }
  }
  await visit(root);
  return files.sort();
}

async function sha256File(filePath) {
  return sha256Buffer(await readFile(filePath));
}

async function sha256Directory(directory) {
  const files = await walkFiles(directory);
  const hash = createHash("sha256");
  for (const relative of files) {
    const absolute = path.join(directory, relative);
    const fileStat = await stat(absolute);
    if (!fileStat.isFile()) {
      continue;
    }
    hash.update(toPosix(relative));
    hash.update("\0");
    hash.update(await readFile(absolute));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}
