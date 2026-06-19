#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assertNoWorkspaceLink,
  buildRoot,
  expectedReferenceGameIds,
  readJson,
  referenceGamesRoot,
  root,
  sha256Directory,
  sha256File,
  writeJson,
} from "./reference-games-lib.mjs";
import { requiredReferenceGameIds } from "./required-ui-scenarios.mjs";

const sdkPackage = "@dreamboard-games/sdk";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--scenario" || arg === "--game") {
      options[arg.slice(2)] = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--sdk-tarball") {
      options.sdkTarball = path.resolve(root, argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--required") {
      options.required = true;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }
  return options;
}

function selectGameIds(options) {
  if (options.required) {
    return [...requiredReferenceGameIds];
  }
  if (options.game) {
    if (!expectedReferenceGameIds.includes(options.game)) {
      throw new Error(
        `Unknown reference game '${options.game}'. Expected one of: ${expectedReferenceGameIds.join(", ")}`,
      );
    }
    return [options.game];
  }
  if (options.scenario) {
    const gameId = expectedReferenceGameIds.find(
      (id) => options.scenario === id || options.scenario.startsWith(`${id}.`),
    );
    if (!gameId) {
      throw new Error(
        `Scenario '${options.scenario}' does not match a reference game prefix. Expected one of: ${expectedReferenceGameIds.join(", ")}`,
      );
    }
    return [gameId];
  }
  return expectedReferenceGameIds;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
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

async function packSdk(tempRoot) {
  run("pnpm", ["--filter", "@dreamboard-games/sdk", "build"], {
    cwd: root,
    stdio: "inherit",
  });
  const pack = run("npm", ["pack", "--json", "--pack-destination", tempRoot], {
    cwd: path.join(root, "packages/sdk"),
  });
  const output = JSON.parse(pack.stdout);
  const tarballName = output[0]?.filename;
  if (!tarballName) {
    throw new Error(`npm pack did not report a tarball\n${pack.stdout}`);
  }
  return {
    tarballPath: path.join(tempRoot, tarballName),
    tarballSha256: await sha256File(path.join(tempRoot, tarballName)),
  };
}

async function resolveSdkTarball(options, tempRoot) {
  if (options.sdkTarball) {
    return {
      tarballPath: options.sdkTarball,
      tarballSha256: await sha256File(options.sdkTarball),
    };
  }
  return packSdk(tempRoot);
}

async function rewriteSdkDependency(sandbox, tarballPath) {
  const packagePath = path.join(sandbox, "package.json");
  const packageJson = await readJson(packagePath);
  packageJson.dependencies = {
    ...packageJson.dependencies,
    [sdkPackage]: `file:${tarballPath}`,
  };
  await writeJson(packagePath, packageJson);
}

function dependencyGraph(cwd) {
  const result = run("pnpm", ["list", sdkPackage, "--json", "--depth", "0"], {
    cwd,
  });
  return JSON.parse(result.stdout);
}

async function verifyGame(gameId, tempRoot, sdkTarballPath) {
  const sourceDir = path.join(referenceGamesRoot, gameId);
  const manifest = await readJson(path.join(sourceDir, "reference-game.json"));
  const sandbox = path.join(tempRoot, "consumers", gameId);
  await mkdir(path.dirname(sandbox), { recursive: true });
  await cp(sourceDir, sandbox, {
    recursive: true,
    filter(source) {
      const name = path.basename(source);
      return name !== "node_modules" && name !== "dist";
    },
  });

  await rewriteSdkDependency(sandbox, sdkTarballPath);
  run(
    "pnpm",
    [
      "install",
      "--frozen-lockfile=false",
      "--ignore-workspace",
      "--config.shared-workspace-lockfile=false",
    ],
    {
      cwd: sandbox,
      stdio: "inherit",
    },
  );
  const sandboxPackage = await readJson(path.join(sandbox, "package.json"));
  const scripts = sandboxPackage.scripts ?? {};
  const v3 = manifest.schemaVersion === 3;
  if (v3) {
    if (scripts.verify) {
      run("pnpm", ["verify"], { cwd: sandbox, stdio: "inherit" });
    } else {
      run("pnpm", ["typecheck"], { cwd: sandbox, stdio: "inherit" });
      run("pnpm", ["test"], { cwd: sandbox, stdio: "inherit" });
      if (scripts["test:ui"]) {
        run("pnpm", ["test:ui"], { cwd: sandbox, stdio: "inherit" });
      }
    }
  } else {
    run("pnpm", ["build"], { cwd: sandbox, stdio: "inherit" });
    run("pnpm", ["test"], { cwd: sandbox, stdio: "inherit" });
  }

  const dependencyResolution = await assertNoWorkspaceLink(sandbox, sdkPackage);
  const graph = dependencyGraph(sandbox);

  return {
    id: gameId,
    packageSha256: await sha256File(path.join(sourceDir, "package.json")),
    lockfileSha256: await sha256File(path.join(sourceDir, "pnpm-lock.yaml")),
    sourceSha256: v3
      ? await sha256Directory(sourceDir, {
          excludeDirs: new Set(["node_modules", "dist"]),
        })
      : await sha256Directory(path.join(sourceDir, "src")),
    scenarioSha256: v3
      ? await sha256Directory(path.join(sourceDir, "test"))
      : await sha256Directory(path.join(sourceDir, "scenarios")),
    ...(v3
      ? {
          typecheck: "passed",
          test: "passed",
          uiTest: scripts["test:ui"] ? "passed" : "not-declared",
        }
      : {
          build: "passed",
          test: "passed",
        }),
    dependencyResolution,
    dependencyGraph: graph,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const gameIds = selectGameIds(options);
  run("node", ["scripts/ui/check-reference-games.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
  const tempRoot = await mkdtemp(
    path.join(tmpdir(), "dreamboard-reference-consumers-"),
  );
  try {
    const { tarballPath, tarballSha256 } = await resolveSdkTarball(
      options,
      tempRoot,
    );
    const games = [];
    for (const gameId of gameIds) {
      games.push(await verifyGame(gameId, tempRoot, tarballPath));
    }
    const receipt = {
      schemaVersion: 1,
      checkedAt: new Date().toISOString(),
      sdkTarballSha256: `sha256:${tarballSha256}`,
      games,
    };
    await mkdir(buildRoot, { recursive: true });
    await writeJson(
      path.join(buildRoot, "packed-consumer-receipt.json"),
      receipt,
    );
    console.log(JSON.stringify(receipt, null, 2));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
