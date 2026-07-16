import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type { AsyncCommandRunner } from "../lib/process.ts";
import { discoverReferenceGames } from "./games.ts";
import { pinReferenceGames, readSdkLockIdentity } from "./pin.ts";
import { verifyReferenceGames } from "./verify.ts";

const sdkPackage = "@dreamboard-games/sdk";
const originalVersion = "0.4.0-alpha.13";
const pinnedVersion = "0.4.0-alpha.14";
const pinnedIntegrity = `sha512-${"a".repeat(88)}`;

async function createRoot(ids: readonly string[]): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "reference-test-"));
  for (const id of ids) {
    const game = path.join(root, "examples/reference-games", id);
    await import("node:fs/promises").then(({ mkdir }) =>
      mkdir(path.join(game, "app"), { recursive: true }),
    );
    await import("node:fs/promises").then(({ mkdir }) =>
      mkdir(path.join(game, "ui"), { recursive: true }),
    );
    for (const file of [
      "rule.md",
      "manifest.ts",
      "app/game.ts",
      "ui/index.tsx",
    ]) {
      await writeFile(path.join(game, file), "export {};\n");
    }
    await writeFile(
      path.join(game, "reference-game.json"),
      `${JSON.stringify(
        {
          schemaVersion: 5,
          id,
          displayName: id,
          workspace: {
            manifest: "manifest.ts",
            reducer: "app/game.ts",
            ui: "ui/index.tsx",
          },
          teaching: {
            whatThisTeaches: ["a pattern"],
            whenToCopyThisPattern: ["when it applies"],
            readFirst: ["rule.md"],
          },
          mechanics: ["example"],
          uiPatterns: ["example"],
          rights: {
            mechanicsProvenance: "original",
            sourceCode: "original",
            codeLicense: "test",
            ruleText: "original",
            thirdPartyMarks: [],
          },
        },
        null,
        2,
      )}\n`,
    );
    await writeFile(
      path.join(game, "package.json"),
      `${JSON.stringify(
        {
          name: `@example/${id}`,
          scripts: {
            materialize: "materialize",
            "typecheck:raw": "typecheck",
            "test:raw": "test",
            "test:ui:raw": "test-ui",
          },
          dependencies: { [sdkPackage]: originalVersion },
        },
        null,
        2,
      )}\n`,
    );
    await writeFile(
      path.join(game, "pnpm-lock.yaml"),
      lockfile(originalVersion, `sha512-${"b".repeat(88)}`),
    );
  }
  return root;
}

function lockfile(version: string, integrity: string): string {
  return `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      '${sdkPackage}':
        specifier: ${version}
        version: ${version}

packages:

  '${sdkPackage}@${version}':
    resolution: {integrity: ${integrity}}
`;
}

test("discovers directories and rejects unknown games", async (context) => {
  const root = await createRoot(["beta", "alpha"]);
  context.after(() => rm(root, { recursive: true, force: true }));
  assert.deepEqual(
    (await discoverReferenceGames({ root })).map((game) => game.id),
    ["alpha", "beta"],
  );
  await assert.rejects(
    discoverReferenceGames({ root, gameId: "missing" }),
    /Unknown reference game 'missing'/,
  );
});

test("rejects unsafe workspace paths and isolated catalog dependencies", async (context) => {
  const root = await createRoot(["unsafe"]);
  context.after(() => rm(root, { recursive: true, force: true }));
  const game = path.join(root, "examples/reference-games/unsafe");
  const manifestPath = path.join(game, "reference-game.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.workspace.reducer = "../outside.ts";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await assert.rejects(
    discoverReferenceGames({ root }),
    /path must stay inside/,
  );

  manifest.workspace.reducer = "app/game.ts";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const packagePath = path.join(game, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.dependencies.react = "catalog:";
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  await assert.rejects(
    discoverReferenceGames({ root }),
    /must not use a pnpm catalog/,
  );
});

test("reads exact SDK lockfile identity", () => {
  assert.deepEqual(
    readSdkLockIdentity(
      lockfile(pinnedVersion, pinnedIntegrity),
      pinnedVersion,
    ),
    {
      specifier: pinnedVersion,
      resolvedVersion: pinnedVersion,
      integrity: pinnedIntegrity,
    },
  );
});

test("pin stages every game before replacing tracked files", async (context) => {
  const root = await createRoot(["alpha", "beta"]);
  context.after(() => rm(root, { recursive: true, force: true }));
  const packagePath = path.join(
    root,
    "examples/reference-games/alpha/package.json",
  );
  const before = await readFile(packagePath, "utf8");
  let installs = 0;
  const failingRun: AsyncCommandRunner = async (_command, _args, options) => {
    installs += 1;
    if (installs === 2) throw new Error("registry unavailable");
    writeFileSync(
      path.join(options?.cwd ?? "", "pnpm-lock.yaml"),
      lockfile(pinnedVersion, pinnedIntegrity),
    );
    return "";
  };
  await assert.rejects(
    pinReferenceGames({
      root,
      version: pinnedVersion,
      fetchMetadata: async () => ({
        name: sdkPackage,
        version: pinnedVersion,
        dist: {
          integrity: pinnedIntegrity,
          tarball: `${"https://registry.npmjs.org/"}@dreamboard-games/sdk/-/sdk.tgz`,
        },
      }),
      run: failingRun,
    }),
    /registry unavailable/,
  );
  assert.equal(await readFile(packagePath, "utf8"), before);
});

test("pin atomically replaces all package manifests and exact-integrity lockfiles", async (context) => {
  const root = await createRoot(["alpha", "beta"]);
  context.after(() => rm(root, { recursive: true, force: true }));
  const run: AsyncCommandRunner = async (_command, _args, options) => {
    writeFileSync(
      path.join(options?.cwd ?? "", "pnpm-lock.yaml"),
      lockfile(pinnedVersion, pinnedIntegrity),
    );
    return "";
  };
  await pinReferenceGames({
    root,
    version: pinnedVersion,
    fetchMetadata: async () => ({
      name: sdkPackage,
      version: pinnedVersion,
      dist: {
        integrity: pinnedIntegrity,
        tarball: `${"https://registry.npmjs.org/"}@dreamboard-games/sdk/-/sdk.tgz`,
      },
    }),
    run,
  });
  for (const id of ["alpha", "beta"]) {
    const game = path.join(root, "examples/reference-games", id);
    const packageJson = JSON.parse(
      readFileSync(path.join(game, "package.json"), "utf8"),
    );
    assert.equal(packageJson.dependencies[sdkPackage], pinnedVersion);
    assert.equal(
      readSdkLockIdentity(
        readFileSync(path.join(game, "pnpm-lock.yaml"), "utf8"),
        pinnedVersion,
      ).integrity,
      pinnedIntegrity,
    );
  }
});

test("packed verification supports one selected game and all discovered games", async (context) => {
  const root = await createRoot(["alpha", "beta"]);
  context.after(() => rm(root, { recursive: true, force: true }));
  const tarball = path.join(root, "sdk.tgz");
  await writeFile(tarball, "candidate");
  const verified: string[] = [];
  const run: AsyncCommandRunner = async (_command, args, options) => {
    if (args.includes("--lockfile=false")) {
      const gameId = path.basename(options?.cwd ?? "");
      verified.push(gameId);
      const installed = path.join(
        options?.cwd ?? "",
        "node_modules",
        "@dreamboard-games",
        "sdk",
      );
      mkdirSync(installed, { recursive: true });
      writeFileSync(
        path.join(installed, "package.json"),
        `${JSON.stringify({ name: sdkPackage, version: pinnedVersion })}\n`,
      );
    }
    return "";
  };

  await verifyReferenceGames({
    root,
    gameId: "alpha",
    sdkTarball: tarball,
    run,
  });
  assert.deepEqual(verified, ["alpha"]);
  verified.length = 0;
  await verifyReferenceGames({ root, sdkTarball: tarball, run });
  assert.deepEqual(verified.sort(), ["alpha", "beta"]);
  assert.equal(existsSync(path.join(root, "build/reference-games")), false);
});

test("packed verification runs at most three games concurrently", async (context) => {
  const root = await createRoot(["alpha", "beta", "delta", "epsilon", "gamma"]);
  context.after(() => rm(root, { recursive: true, force: true }));
  const tarball = path.join(root, "sdk.tgz");
  await writeFile(tarball, "candidate");
  let active = 0;
  let maximumActive = 0;
  const started: string[] = [];
  const run: AsyncCommandRunner = async (_command, args, options) => {
    if (!args.includes("--lockfile=false")) return "";
    const cwd = options?.cwd ?? "";
    const gameId = path.basename(cwd);
    started.push(gameId);
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, 20));
    active -= 1;
    const installed = path.join(
      cwd,
      "node_modules",
      "@dreamboard-games",
      "sdk",
    );
    mkdirSync(installed, { recursive: true });
    writeFileSync(
      path.join(installed, "package.json"),
      `${JSON.stringify({ name: sdkPackage, version: pinnedVersion })}\n`,
    );
    return "";
  };

  await verifyReferenceGames({ root, sdkTarball: tarball, run });

  assert.equal(maximumActive, 3);
  assert.equal(started.length, 5);
});

test("frozen lockfile failure prevents candidate verification", async (context) => {
  const root = await createRoot(["alpha", "beta"]);
  context.after(() => rm(root, { recursive: true, force: true }));
  const tarball = path.join(root, "sdk.tgz");
  await writeFile(tarball, "candidate");
  let candidateInstalls = 0;
  const run: AsyncCommandRunner = async (_command, args) => {
    if (args.includes("--frozen-lockfile")) {
      throw new Error("frozen lockfile drift");
    }
    if (args.includes("--lockfile=false")) candidateInstalls += 1;
    return "";
  };

  await assert.rejects(
    verifyReferenceGames({ root, sdkTarball: tarball, run }),
    /frozen lockfile drift/,
  );
  assert.equal(candidateInstalls, 0);
});

test("candidate failure stops scheduling and removes temporary state", async (context) => {
  const root = await createRoot(["alpha", "beta", "delta", "epsilon", "gamma"]);
  context.after(() => rm(root, { recursive: true, force: true }));
  const tarball = path.join(root, "sdk.tgz");
  await writeFile(tarball, "candidate");
  const started: string[] = [];
  let temporaryRoot = "";
  const run: AsyncCommandRunner = async (_command, args, options) => {
    if (!args.includes("--lockfile=false")) return "";
    const cwd = options?.cwd ?? "";
    const gameId = path.basename(cwd);
    temporaryRoot = path.dirname(path.dirname(cwd));
    started.push(gameId);
    if (gameId === "alpha") throw new Error("candidate install failed");
    await new Promise((resolve) => setTimeout(resolve, 20));
    const installed = path.join(
      cwd,
      "node_modules",
      "@dreamboard-games",
      "sdk",
    );
    mkdirSync(installed, { recursive: true });
    writeFileSync(
      path.join(installed, "package.json"),
      `${JSON.stringify({ name: sdkPackage, version: pinnedVersion })}\n`,
    );
    return "";
  };

  await assert.rejects(
    verifyReferenceGames({ root, sdkTarball: tarball, run }),
    /\[reference:alpha\] failed[\s\S]*candidate install failed/,
  );
  assert.deepEqual(started.sort(), ["alpha", "beta", "delta"]);
  assert.ok(temporaryRoot);
  assert.equal(existsSync(temporaryRoot), false);
});
