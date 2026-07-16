import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  discoverReferenceGames,
  EXACT_VERSION_PATTERN,
  SDK_PACKAGE_NAME,
  type PackageJson,
  type ReferenceGame,
} from "./games.ts";
import { runCommand, type CommandRunner } from "./process.ts";

const PUBLIC_NPM_REGISTRY = "https://registry.npmjs.org/";

export type NpmVersionMetadata = {
  readonly name?: string;
  readonly version?: string;
  readonly dist?: {
    readonly integrity?: string;
    readonly tarball?: string;
  };
};

export type PinReferenceGamesOptions = {
  readonly root: string;
  readonly version: string;
  readonly fetchMetadata?: (version: string) => Promise<NpmVersionMetadata>;
  readonly run?: CommandRunner;
};

type Replacement = {
  readonly target: string;
  readonly contents: string;
};

export function requireExactPublicVersion(version: string): void {
  if (
    !EXACT_VERSION_PATTERN.test(version) ||
    /(?:^|[-.])local(?:[-.]|$)/i.test(version)
  ) {
    throw new Error(
      `${SDK_PACKAGE_NAME} version must be one exact public npm version, received ${JSON.stringify(version)}`,
    );
  }
}

export async function fetchPublicSdkMetadata(
  version: string,
): Promise<NpmVersionMetadata> {
  const response = await fetch(
    `${PUBLIC_NPM_REGISTRY}${SDK_PACKAGE_NAME.replace("/", "%2F")}/${version}`,
  );
  if (!response.ok) {
    throw new Error(
      `${SDK_PACKAGE_NAME}@${version} is not published (${response.status} ${response.statusText})`,
    );
  }
  return (await response.json()) as NpmVersionMetadata;
}

function assertRegistryMetadata(
  version: string,
  metadata: NpmVersionMetadata,
): string {
  if (metadata.name !== SDK_PACKAGE_NAME || metadata.version !== version) {
    throw new Error(
      `Registry returned ${metadata.name ?? "<missing>"}@${metadata.version ?? "<missing>"}; expected ${SDK_PACKAGE_NAME}@${version}`,
    );
  }
  const integrity = metadata.dist?.integrity;
  if (!integrity?.startsWith("sha512-")) {
    throw new Error(`${SDK_PACKAGE_NAME}@${version} has no sha512 integrity`);
  }
  if (!metadata.dist?.tarball?.startsWith(PUBLIC_NPM_REGISTRY)) {
    throw new Error(`${SDK_PACKAGE_NAME}@${version} has no public npm tarball`);
  }
  return integrity;
}

export function readSdkLockIdentity(
  lockfile: string,
  version: string,
): {
  readonly specifier?: string;
  readonly resolvedVersion?: string;
  readonly integrity?: string;
} {
  const packageName = SDK_PACKAGE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const packageVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const importer = lockfile.match(
    new RegExp(
      String.raw`importers:\n(?:[\s\S]*?)  \.:\n(?:[\s\S]*?)      ['"]?${packageName}['"]?:\n        specifier: ([^\n]+)\n        version: ([^\n]+)`,
    ),
  );
  const packageEntry = lockfile.match(
    new RegExp(
      String.raw`  ['"]?${packageName}@${packageVersion}['"]?:\n    resolution: \{integrity: ([^,}\n]+)`,
    ),
  );
  const clean = (value: string | undefined) =>
    value?.trim().replace(/^['"]|['"]$/g, "");
  return {
    specifier: clean(importer?.[1]),
    resolvedVersion: clean(importer?.[2]),
    integrity: clean(packageEntry?.[1]),
  };
}

function assertLockIdentity(
  gameId: string,
  lockfile: string,
  version: string,
  integrity: string,
): void {
  const identity = readSdkLockIdentity(lockfile, version);
  if (identity.specifier !== version) {
    throw new Error(
      `${gameId}: lockfile SDK specifier is ${identity.specifier ?? "<missing>"}; expected ${version}`,
    );
  }
  if (
    identity.resolvedVersion !== version &&
    !identity.resolvedVersion?.startsWith(`${version}(`)
  ) {
    throw new Error(
      `${gameId}: lockfile SDK resolution is ${identity.resolvedVersion ?? "<missing>"}; expected ${version}`,
    );
  }
  if (identity.integrity !== integrity) {
    throw new Error(
      `${gameId}: lockfile SDK integrity is ${identity.integrity ?? "<missing>"}; expected ${integrity}`,
    );
  }
}

async function stageGamePin(
  game: ReferenceGame,
  stageRoot: string,
  version: string,
  integrity: string,
  run: CommandRunner,
): Promise<Replacement[]> {
  const packageJson = JSON.parse(
    await readFile(game.packageJsonPath, "utf8"),
  ) as PackageJson;
  packageJson.dependencies = {
    ...packageJson.dependencies,
    [SDK_PACKAGE_NAME]: version,
  };
  const packageContents = `${JSON.stringify(packageJson, null, 2)}\n`;
  const stageDir = path.join(stageRoot, game.id);
  await mkdir(stageDir, { recursive: true });
  await writeFile(path.join(stageDir, "package.json"), packageContents);
  await writeFile(
    path.join(stageDir, "pnpm-lock.yaml"),
    await readFile(game.lockfilePath),
  );
  run(
    "pnpm",
    [
      "install",
      "--lockfile-only",
      "--no-frozen-lockfile",
      "--ignore-workspace",
      "--config.shared-workspace-lockfile=false",
      "--ignore-scripts",
    ],
    {
      cwd: stageDir,
      stdio: "inherit",
      env: {
        ...process.env,
        CI: "true",
        npm_config_registry: PUBLIC_NPM_REGISTRY,
      },
    },
  );
  const lockContents = await readFile(
    path.join(stageDir, "pnpm-lock.yaml"),
    "utf8",
  );
  assertLockIdentity(game.id, lockContents, version, integrity);
  return [
    { target: game.packageJsonPath, contents: packageContents },
    { target: game.lockfilePath, contents: lockContents },
  ];
}

export async function replaceFilesAtomically(
  replacements: readonly Replacement[],
): Promise<void> {
  const originals = new Map<string, string>();
  const staged: string[] = [];
  const replaced: string[] = [];
  try {
    for (const replacement of replacements) {
      originals.set(
        replacement.target,
        await readFile(replacement.target, "utf8"),
      );
      const stagedPath = `${replacement.target}.pin-${process.pid}`;
      await writeFile(stagedPath, replacement.contents);
      staged.push(stagedPath);
    }
    for (let index = 0; index < replacements.length; index += 1) {
      await rename(staged[index], replacements[index].target);
      replaced.push(replacements[index].target);
    }
  } catch (error) {
    await Promise.all(
      replaced.map((target) => writeFile(target, originals.get(target) ?? "")),
    );
    throw error;
  } finally {
    await Promise.all(staged.map((file) => rm(file, { force: true })));
  }
}

export async function pinReferenceGames(
  options: PinReferenceGamesOptions,
): Promise<void> {
  requireExactPublicVersion(options.version);
  const metadata = await (options.fetchMetadata ?? fetchPublicSdkMetadata)(
    options.version,
  );
  const integrity = assertRegistryMetadata(options.version, metadata);
  const games = await discoverReferenceGames({ root: options.root });
  const stageRoot = await mkdtemp(
    path.join(tmpdir(), "dreamboard-reference-pin-"),
  );
  try {
    const replacements: Replacement[] = [];
    for (const game of games) {
      replacements.push(
        ...(await stageGamePin(
          game,
          stageRoot,
          options.version,
          integrity,
          options.run ?? runCommand,
        )),
      );
    }
    await replaceFilesAtomically(replacements);
  } finally {
    await rm(stageRoot, { recursive: true, force: true });
  }
}
