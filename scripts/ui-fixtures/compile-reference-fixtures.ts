#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { cp, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { DREAMBOARD_PLUGIN_PROTOCOL_VERSION } from "../../packages/plugin-runtime-contract/dist/index.js";
import {
  compareCanonicalStrings,
  discoverReferenceGames,
  readJson,
  repoCommandEnv,
  root,
  sha256File,
  writeJson,
} from "../ui/support.ts";
import { compileScenarioModule } from "./compile-scenario.ts";
import { discoverAllScenarioModules } from "./discover-scenarios.ts";
import { loadScenarioModule } from "./load-scenario-module.ts";
import { withTemporarySourcePackageLinks } from "./workspace/package-links.ts";

const sdkRequire = createRequire(
  new URL("../../packages/sdk/package.json", import.meta.url),
);
const { GlobalRegistrator } = sdkRequire("@happy-dom/global-registrator") as {
  readonly GlobalRegistrator: { register(): void };
};

const defaultFixturesRoot = path.join(
  root,
  "build/ui-workbench/generated/fixtures/reference-games",
);
const browserInteractionProtocolVersion = "3.0.0";
GlobalRegistrator.register();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

interface FixtureIndexEntry {
  readonly id: string;
  readonly [key: string]: unknown;
}

interface FixtureBundle {
  readonly fixtures: readonly FixtureIndexEntry[];
}

export interface CompileReferenceFixturesOptions {
  readonly outputRoot?: string;
  readonly gameIds?: readonly string[];
}

export interface CompiledReferenceFixtures {
  readonly fixtureCount: number;
  readonly outputRoot: string;
  readonly digest: string;
}

function run(command: string, args: readonly string[]): string {
  const result = spawnSync(command, args, {
    cwd: root,
    env: command === "git" ? repoCommandEnv() : process.env,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${root}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result.stdout.trim();
}

async function hashOutputFiles(
  outputRoot: string,
): Promise<readonly (readonly [string, string])[]> {
  const files: Array<readonly [string, string]> = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) {
        files.push([
          path.relative(outputRoot, absolute),
          await sha256File(absolute),
        ]);
      }
    }
  }
  await visit(outputRoot);
  return files.sort(([left], [right]) => compareCanonicalStrings(left, right));
}

async function compileAllReferenceFixtures(
  outputRoot: string,
  gameIds: readonly string[],
): Promise<number> {
  await mkdir(path.join(outputRoot, "modules"), { recursive: true });
  const sdkCommit = run("git", ["rev-parse", "--short=12", "HEAD"]);
  const fixtures: FixtureIndexEntry[] = [];
  const selected = new Set(gameIds);
  const modules = (await discoverAllScenarioModules()).filter((entry) =>
    selected.has(entry.game.id),
  );
  for (const entry of modules) {
    const scenario = await loadScenarioModule(entry.modulePath);
    try {
      fixtures.push(
        (await compileScenarioModule({
          game: entry.game,
          gameDir: entry.gameDir,
          scenario,
          outputRoot,
          sdkCommit,
        })) as FixtureIndexEntry,
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

async function compileFixturePartitions(
  outputRoot: string,
  gameIds: readonly string[],
): Promise<number> {
  const partitionsRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-ui-fixture-partitions-"),
  );
  const fixtures: FixtureIndexEntry[] = [];
  await mkdir(outputRoot, { recursive: true });
  try {
    for (const gameId of gameIds) {
      const partitionRoot = path.join(partitionsRoot, gameId);
      const result = spawnSync(
        process.execPath,
        [
          fileURLToPath(import.meta.url),
          "--out",
          partitionRoot,
          "--game",
          gameId,
        ],
        {
          cwd: root,
          env: process.env,
          encoding: "utf8",
          stdio: "pipe",
          maxBuffer: 10 * 1024 * 1024,
        },
      );
      if (result.status !== 0) {
        throw new Error(
          `UI fixture partition '${gameId}' failed.\n${result.stdout ?? ""}${result.stderr ?? ""}`,
        );
      }
      const partition = (await readJson(
        path.join(partitionRoot, "index.json"),
      )) as FixtureBundle;
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
  gameIds = [],
}: CompileReferenceFixturesOptions = {}): Promise<CompiledReferenceFixtures> {
  const knownGameIds = (await discoverReferenceGames()).map(({ id }) => id);
  const selectedGameIds =
    gameIds.length === 0 ? [...knownGameIds, "ui-scenarios"] : [...gameIds];
  const unknown = selectedGameIds.filter(
    (id) => id !== "ui-scenarios" && !knownGameIds.includes(id),
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown UI fixture game: ${unknown.join(", ")}.`);
  }
  const gameRoots = selectedGameIds
    .filter((id) => id !== "ui-scenarios")
    .map((id) => path.join(root, "examples/reference-games", id));
  const resolvedOutputRoot = path.resolve(outputRoot);
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-ui-fixtures-"),
  );
  try {
    const fixtureCount =
      selectedGameIds.length === 1
        ? await withTemporarySourcePackageLinks(gameRoots, () =>
            compileAllReferenceFixtures(temporaryRoot, selectedGameIds),
          )
        : await compileFixturePartitions(temporaryRoot, selectedGameIds);
    const files = await hashOutputFiles(temporaryRoot);
    await rm(resolvedOutputRoot, { recursive: true, force: true });
    await mkdir(resolvedOutputRoot, { recursive: true });
    await cp(temporaryRoot, resolvedOutputRoot, { recursive: true });
    return {
      fixtureCount,
      outputRoot: resolvedOutputRoot,
      digest: `sha256:${createHash("sha256")
        .update(JSON.stringify(files))
        .digest("hex")}`,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

type CliOptions = CompileReferenceFixturesOptions;

function parseArgs(argv: readonly string[]): CliOptions {
  const options: { outputRoot?: string; gameIds: string[] } = { gameIds: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--out") {
      const value = argv[++index];
      if (!value) throw new Error("--out requires a directory.");
      options.outputRoot = value;
    } else if (argument === "--game") {
      const value = argv[++index];
      if (!value) throw new Error("--game requires an id.");
      options.gameIds.push(value);
    } else {
      throw new Error(`Unknown argument '${argument}'.`);
    }
  }
  return options;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  compileReferenceFixtures(parseArgs(process.argv.slice(2)))
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

declare global {
  // React uses this flag to decide whether act() warnings are actionable.
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}
