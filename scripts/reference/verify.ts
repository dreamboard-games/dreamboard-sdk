import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  discoverReferenceGames,
  SDK_PACKAGE_NAME,
  type PackageJson,
  type ReferenceGame,
} from "./games.ts";
import { runCommand, type CommandRunner } from "./process.ts";

export type VerifyReferenceGamesOptions = {
  readonly root: string;
  readonly gameId?: string;
  readonly sdkTarball?: string;
  readonly run?: CommandRunner;
};

const isolatedInstallArgs = [
  "install",
  "--ignore-workspace",
  "--config.shared-workspace-lockfile=false",
] as const;

async function packSdk(
  root: string,
  destination: string,
  run: CommandRunner,
): Promise<string> {
  run(
    "pnpm",
    ["exec", "turbo", "run", "build", `--filter=${SDK_PACKAGE_NAME}`],
    {
      cwd: root,
      stdio: "inherit",
    },
  );
  const before = new Set(await readdir(destination));
  run(
    "pnpm",
    [
      "--dir",
      path.join(root, "packages/sdk"),
      "pack",
      "--pack-destination",
      destination,
    ],
    { cwd: root, stdio: "pipe" },
  );
  const tarballs = (await readdir(destination)).filter(
    (name) => name.endsWith(".tgz") && !before.has(name),
  );
  if (tarballs.length !== 1) {
    throw new Error(
      `pnpm pack must create exactly one SDK tarball, created ${tarballs.length}`,
    );
  }
  return path.join(destination, tarballs[0]);
}

async function validateFrozenLockfile(
  game: ReferenceGame,
  run: CommandRunner,
): Promise<void> {
  run("pnpm", [...isolatedInstallArgs, "--frozen-lockfile"], {
    cwd: game.dir,
    stdio: "inherit",
  });
}

async function copyGame(source: string, destination: string): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, {
    recursive: true,
    filter(candidate) {
      const relative = path.relative(source, candidate);
      if (!relative) return true;
      const segments = relative.split(path.sep);
      if (
        segments.some((segment) =>
          ["node_modules", ".turbo", "dist"].includes(segment),
        )
      ) {
        return false;
      }
      return (
        relative !== path.join("shared", "generated") &&
        !relative.startsWith(`${path.join("shared", "generated")}${path.sep}`)
      );
    },
  });
}

async function installCandidate(
  game: ReferenceGame,
  sandbox: string,
  sdkTarball: string,
  run: CommandRunner,
): Promise<void> {
  const packagePath = path.join(sandbox, "package.json");
  const packageJson = JSON.parse(
    await readFile(packagePath, "utf8"),
  ) as PackageJson;
  packageJson.dependencies = {
    ...packageJson.dependencies,
    [SDK_PACKAGE_NAME]: `file:${sdkTarball}`,
  };
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  await unlink(path.join(sandbox, "pnpm-lock.yaml")).catch((error: unknown) => {
    if (
      !(error instanceof Error && "code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
  });

  run(
    "pnpm",
    [...isolatedInstallArgs, "--no-frozen-lockfile", "--lockfile=false"],
    { cwd: sandbox, stdio: "inherit" },
  );
  run("pnpm", ["run", "materialize"], { cwd: sandbox, stdio: "inherit" });
  for (const script of ["typecheck:raw", "test:raw", "test:ui:raw"]) {
    run("pnpm", ["run", script], { cwd: sandbox, stdio: "inherit" });
  }

  const installedPackage = JSON.parse(
    await readFile(
      path.join(
        sandbox,
        "node_modules",
        ...SDK_PACKAGE_NAME.split("/"),
        "package.json",
      ),
      "utf8",
    ),
  ) as PackageJson;
  if (!installedPackage.version) {
    throw new Error(`${game.id}: packed SDK did not install as a package`);
  }
}

export async function verifyReferenceGames(
  options: VerifyReferenceGamesOptions,
): Promise<void> {
  const run = options.run ?? runCommand;
  const games = await discoverReferenceGames({
    root: options.root,
    ...(options.gameId ? { gameId: options.gameId } : {}),
  });
  for (const game of games) await validateFrozenLockfile(game, run);

  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), "dreamboard-reference-"),
  );
  try {
    const sdkTarball = options.sdkTarball
      ? path.resolve(options.root, options.sdkTarball)
      : await packSdk(options.root, temporaryRoot, run);
    await readFile(sdkTarball);

    for (const game of games) {
      const sandbox = path.join(temporaryRoot, "games", game.id);
      await copyGame(game.dir, sandbox);
      await installCandidate(game, sandbox, sdkTarball, run);
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}
