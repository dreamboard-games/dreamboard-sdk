#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { cp, mkdir, mkdtemp, readdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  repoCommandEnv,
  root,
  sha256File,
  writeJson,
} from "../ui/reference-games-lib.mjs";
import { compileScenarioModule } from "./compile-scenario.mjs";
import { discoverReferenceGameScenarioModules } from "./discover-scenarios.mjs";
import { loadScenarioModule } from "./load-scenario-module.mjs";
import { DREAMBOARD_PLUGIN_PROTOCOL_VERSION } from "../../packages/plugin-runtime-contract/dist/index.js";

const sdkRequire = createRequire(
  new URL("../../packages/sdk/package.json", import.meta.url),
);
const { GlobalRegistrator } = sdkRequire("@happy-dom/global-registrator");

const fixturesRoot = path.join(root, "fixtures/ui/reference-games");
const browserInteractionProtocolVersion = "3.0.0";
GlobalRegistrator.register();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function withTemporaryNodeModuleLinks(callback) {
  const links = [
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
  ];
  const created = [];
  for (const item of links) {
    try {
      await mkdir(path.dirname(item.link), { recursive: true });
      await symlink(item.target, item.link, "dir");
      created.push(item.link);
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
    }
  }
  try {
    return await callback();
  } finally {
    await Promise.all(
      created.reverse().map((link) => rm(link, { force: true })),
    );
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
  return files.sort(([left], [right]) => left.localeCompare(right));
}

async function compileAll(outputRoot) {
  await mkdir(path.join(outputRoot, "modules"), { recursive: true });
  const sdkCommit = run("git", ["rev-parse", "--short=12", "HEAD"]);
  const fixtures = [];
  const modules = await discoverReferenceGameScenarioModules();
  for (const entry of modules) {
    fixtures.push(
      await compileScenarioModule({
        game: entry.game,
        gameDir: entry.gameDir,
        scenario: await loadScenarioModule(entry.modulePath),
        outputRoot,
        sdkCommit,
      }),
    );
  }
  await writeJson(path.join(outputRoot, "index.json"), {
    schemaVersion: 2,
    bundleId: `reference-games@${sdkCommit}`,
    sdkCommit,
    pluginRuntimeProtocol: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
    browserInteractionProtocol: browserInteractionProtocolVersion,
    fixtures: fixtures.sort((left, right) => left.id.localeCompare(right.id)),
  });
  return fixtures.length;
}

async function main() {
  const tmpRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-ui-fixtures-"),
  );
  const first = path.join(tmpRoot, "first");
  const second = path.join(tmpRoot, "second");
  try {
    let fixtureCount = 0;
    await withTemporaryNodeModuleLinks(async () => {
      fixtureCount = await compileAll(first);
      await compileAll(second);
    });
    const firstHashes = JSON.stringify(await hashOutputFiles(first));
    const secondHashes = JSON.stringify(await hashOutputFiles(second));
    if (firstHashes !== secondHashes) {
      throw new Error("Reference UI fixture compilation is non-deterministic.");
    }

    await rm(fixturesRoot, { recursive: true, force: true });
    await mkdir(fixturesRoot, { recursive: true });
    await cp(first, fixturesRoot, { recursive: true });
    console.log(`compiled ${fixtureCount} UI fixtures`);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
