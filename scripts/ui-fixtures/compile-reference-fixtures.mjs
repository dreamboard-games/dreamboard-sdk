#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readlink,
  readdir,
  rm,
  symlink,
  unlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  repoCommandEnv,
  compareCanonicalStrings,
  expectedReferenceGames,
  readJson,
  root,
  sha256File,
  writeJson,
} from "../ui/reference-games-lib.mjs";
import { compileScenarioModule } from "./compile-scenario.mjs";
import { discoverAllScenarioModules } from "./discover-scenarios.mjs";
import { loadScenarioModule } from "./load-scenario-module.mjs";
import { DREAMBOARD_PLUGIN_PROTOCOL_VERSION } from "../../packages/plugin-runtime-contract/dist/index.js";

const sdkRequire = createRequire(
  new URL("../../packages/sdk/package.json", import.meta.url),
);
const { GlobalRegistrator } = sdkRequire("@happy-dom/global-registrator");

const defaultFixturesRoot = path.join(
  root,
  "build/ui-workbench/generated/fixtures/reference-games",
);
const browserInteractionProtocolVersion = "3.0.0";
GlobalRegistrator.register();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export async function withTemporaryNodeModuleLinks(callback) {
  const linkTargets = [
    {
      link: path.join(root, "node_modules/@dreamboard-games/sdk"),
      target: path.join(root, "packages/sdk"),
    },
    {
      link: path.join(
        root,
        "node_modules/@dreamboard-games/plugin-runtime-contract",
      ),
      target: path.join(root, "packages/plugin-runtime-contract"),
    },
    {
      link: path.join(root, "node_modules/react"),
      target: path.dirname(sdkRequire.resolve("react/package.json")),
    },
    {
      link: path.join(root, "node_modules/react-dom"),
      target: path.dirname(sdkRequire.resolve("react-dom/package.json")),
    },
  ];
  for (const game of expectedReferenceGames) {
    const gameNodeModules = path.join(
      root,
      "examples/reference-games",
      game.id,
      "node_modules",
    );
    linkTargets.push(
      {
        link: path.join(gameNodeModules, "@dreamboard-games/sdk"),
        target: path.join(root, "packages/sdk"),
      },
      {
        link: path.join(
          gameNodeModules,
          "@dreamboard-games/plugin-runtime-contract",
        ),
        target: path.join(root, "packages/plugin-runtime-contract"),
      },
      {
        link: path.join(gameNodeModules, "react"),
        target: path.dirname(sdkRequire.resolve("react/package.json")),
      },
      {
        link: path.join(gameNodeModules, "react-dom"),
        target: path.dirname(sdkRequire.resolve("react-dom/package.json")),
      },
    );
  }

  const restore = [];
  for (const item of linkTargets) {
    try {
      await mkdir(path.dirname(item.link), { recursive: true });
      const stat = await lstat(item.link).catch((error) => {
        if (error?.code === "ENOENT") return null;
        throw error;
      });
      if (stat) {
        if (!stat.isSymbolicLink()) {
          throw new Error(
            `${item.link} exists and is not a symlink; refusing to replace it for fixture compilation.`,
          );
        }
        const previousTarget = await readlink(item.link);
        await unlink(item.link);
        restore.push(async () => {
          await rm(item.link, { force: true });
          await symlink(previousTarget, item.link, "dir");
        });
      } else {
        restore.push(async () => {
          await rm(item.link, { force: true });
        });
      }
      await symlink(item.target, item.link, "dir");
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
    }
  }
  try {
    return await callback();
  } finally {
    for (const restoreLink of restore.reverse()) {
      await restoreLink();
    }
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env:
      command === "git"
        ? repoCommandEnv(options.env)
        : (options.env ?? process.env),
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${options.cwd ?? root}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result.stdout.trim();
}

async function hashOutputFiles(outputRoot) {
  const files = [];
  async function visit(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        const relative = path.relative(outputRoot, absolute);
        files.push([relative, await sha256File(absolute)]);
      }
    }
  }
  await visit(outputRoot);
  return files.sort(([left], [right]) => compareCanonicalStrings(left, right));
}

export async function compileAllReferenceFixtures(
  outputRoot,
  { gameIds = [] } = {},
) {
  await mkdir(path.join(outputRoot, "modules"), { recursive: true });
  const sdkCommit = run("git", ["rev-parse", "--short=12", "HEAD"]);
  const fixtures = [];
  const selectedGameIds = new Set(gameIds);
  const modules = (await discoverAllScenarioModules()).filter(
    (entry) => selectedGameIds.size === 0 || selectedGameIds.has(entry.game.id),
  );
  for (const entry of modules) {
    const scenario = await loadScenarioModule(entry.modulePath);
    try {
      fixtures.push(
        await compileScenarioModule({
          game: entry.game,
          gameDir: entry.gameDir,
          scenario,
          outputRoot,
          sdkCommit,
        }),
      );
    } catch (error) {
      const cause = error instanceof Error ? error : new Error(String(error));
      throw new Error(
        `${entry.game.id}/${scenario.id} failed while compiling UI fixture ${path.relative(root, entry.modulePath)}`,
        { cause },
      );
    }
  }
  await writeJson(path.join(outputRoot, "index.json"), {
    schemaVersion: 2,
    bundleId: `reference-games@${sdkCommit}`,
    sdkCommit,
    pluginRuntimeProtocol: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
    browserInteractionProtocol: browserInteractionProtocolVersion,
    fixtures: fixtures.sort((left, right) =>
      compareCanonicalStrings(left.id, right.id),
    ),
  });
  return fixtures.length;
}

async function compileReferenceFixturePartitions(outputRoot, gameIds) {
  await mkdir(outputRoot, { recursive: true });
  const partitionsRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-ui-fixture-partitions-"),
  );
  const fixtures = [];
  try {
    for (const gameId of gameIds) {
      const partitionRoot = path.join(partitionsRoot, gameId);
      run(
        process.execPath,
        [
          fileURLToPath(import.meta.url),
          "--out",
          partitionRoot,
          "--no-determinism-check",
          "--game",
          gameId,
        ],
        { stdio: "pipe" },
      );
      const partition = await readJson(path.join(partitionRoot, "index.json"));
      fixtures.push(...partition.fixtures);
      for (const entry of await readdir(partitionRoot, {
        withFileTypes: true,
      })) {
        if (entry.name === "index.json") continue;
        await cp(
          path.join(partitionRoot, entry.name),
          path.join(outputRoot, entry.name),
          { recursive: true, force: true },
        );
      }
    }
    const sdkCommit = run("git", ["rev-parse", "--short=12", "HEAD"]);
    await writeJson(path.join(outputRoot, "index.json"), {
      schemaVersion: 2,
      bundleId: `reference-games@${sdkCommit}`,
      sdkCommit,
      pluginRuntimeProtocol: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
      browserInteractionProtocol: browserInteractionProtocolVersion,
      fixtures: fixtures.sort((left, right) =>
        compareCanonicalStrings(left.id, right.id),
      ),
    });
    return fixtures.length;
  } finally {
    await rm(partitionsRoot, { recursive: true, force: true });
  }
}

export async function compileReferenceFixtures({
  outputRoot = defaultFixturesRoot,
  verifyDeterminism = true,
  gameIds = [],
} = {}) {
  const resolvedOutputRoot = path.resolve(outputRoot);
  const tmpRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-ui-fixtures-"),
  );
  const first = path.join(tmpRoot, "first");
  const second = path.join(tmpRoot, "second");
  try {
    let fixtureCount = 0;
    const selectedGameIds =
      gameIds.length > 0 ? gameIds : expectedReferenceGames.map(({ id }) => id);
    if (selectedGameIds.length === 1) {
      await withTemporaryNodeModuleLinks(async () => {
        fixtureCount = await compileAllReferenceFixtures(first, {
          gameIds: selectedGameIds,
        });
        if (verifyDeterminism) {
          await compileAllReferenceFixtures(second, {
            gameIds: selectedGameIds,
          });
        }
      });
    } else {
      fixtureCount = await compileReferenceFixturePartitions(
        first,
        selectedGameIds,
      );
      if (verifyDeterminism) {
        await compileReferenceFixturePartitions(second, selectedGameIds);
      }
    }
    const firstFiles = await hashOutputFiles(first);
    if (verifyDeterminism) {
      const secondFiles = await hashOutputFiles(second);
      if (JSON.stringify(firstFiles) !== JSON.stringify(secondFiles)) {
        throw new Error(
          "Reference UI fixture compilation is non-deterministic.",
        );
      }
    }

    await rm(resolvedOutputRoot, { recursive: true, force: true });
    await mkdir(resolvedOutputRoot, { recursive: true });
    await cp(first, resolvedOutputRoot, { recursive: true });
    return {
      fixtureCount,
      outputRoot: resolvedOutputRoot,
      digest: `sha256:${createHash("sha256")
        .update(JSON.stringify(firstFiles))
        .digest("hex")}`,
    };
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out") {
      options.outputRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--no-determinism-check") {
      options.verifyDeterminism = false;
      continue;
    }
    if (arg === "--game") {
      options.gameIds ??= [];
      options.gameIds.push(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }
  return options;
}

async function main() {
  const result = await compileReferenceFixtures(
    parseArgs(process.argv.slice(2)),
  );
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
