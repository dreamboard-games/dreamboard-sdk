#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { compileReferenceFixtures } from "../ui-fixtures/compile-reference-fixtures.mjs";
import { checkReferenceFixtures } from "../ui-fixtures/check-fixtures.mjs";
import { materializeReferenceGameWorkspaces } from "../reference-games/materialize-workspace.mjs";
import { generateScenarioCatalog } from "./generate-scenario-catalog.mjs";
import {
  requiredGenericUIScenarioIds,
  requiredWorkbenchScenarioIds,
} from "./required-ui-scenarios.mjs";
import {
  compareCanonicalStrings,
  expectedReferenceGames,
  root,
} from "./reference-games-lib.mjs";
import {
  replaceDirectoryAtomically,
  withWorkbenchMaterializationLock,
} from "./workbench-materialization-guard.mjs";

export const defaultGeneratedWorkbenchRoot = path.join(
  root,
  "build/ui-workbench/generated",
);
const workbenchMaterializerContractVersion = "2";
const workbenchCacheRoot = path.join(root, "build/ui-workbench/cache");

export async function materializeWorkbench({
  outputRoot = defaultGeneratedWorkbenchRoot,
  verifyDeterminism = true,
  checkComponentIndex = false,
  gameIds = [],
  useCache = !verifyDeterminism && gameIds.length > 0,
  reuseExisting = false,
} = {}) {
  return withWorkbenchMaterializationLock(() =>
    materializeWorkbenchUnlocked({
      outputRoot,
      verifyDeterminism,
      checkComponentIndex,
      gameIds,
      useCache,
      reuseExisting,
    }),
  );
}

async function materializeWorkbenchUnlocked({
  outputRoot,
  verifyDeterminism,
  checkComponentIndex,
  gameIds,
  useCache,
  reuseExisting,
}) {
  const resolvedOutputRoot = path.resolve(outputRoot);
  const selectedGameIds = [...new Set(gameIds)].sort(compareCanonicalStrings);
  const referenceGameIds = selectedGameIds.filter((gameId) =>
    expectedReferenceGames.some((game) => game.id === gameId),
  );
  const inputDigest = await digestMaterializerInputs(selectedGameIds);
  if (reuseExisting) {
    const existingReceipt = await readReusableReceipt(resolvedOutputRoot, {
      inputDigest,
      selectedGameIds,
      verifyDeterminism,
    });
    if (existingReceipt) return existingReceipt;
  }
  const cacheEntry = path.join(
    workbenchCacheRoot,
    inputDigest.slice("sha256:".length),
  );
  if (
    useCache &&
    (await stat(path.join(cacheEntry, "catalog.ts")).catch(() => null))
  ) {
    const temp = await mkdtemp(
      path.join(os.tmpdir(), "dreamboard-workbench-cache-hit-"),
    );
    await cp(cacheEntry, temp, { recursive: true, force: true });
    const receipt = JSON.parse(
      await readFile(path.join(temp, "materialization-receipt.json"), "utf8"),
    );
    const currentReceipt = {
      ...receipt,
      generatedRoot: resolvedOutputRoot,
      cache: { hit: true, inputDigest },
    };
    await writeFile(
      path.join(temp, "materialization-receipt.json"),
      `${JSON.stringify(currentReceipt, null, 2)}\n`,
    );
    await replaceDirectoryAtomically(temp, resolvedOutputRoot);
    return currentReceipt;
  }

  const materializeSelectedWorkspaces = () =>
    referenceGameIds.length === 0 && selectedGameIds.length > 0
      ? Promise.resolve({ schemaVersion: 1, games: [] })
      : materializeReferenceGameWorkspaces({
          gameIds: referenceGameIds.length > 0 ? referenceGameIds : undefined,
        });
  const firstWorkspace = await materializeSelectedWorkspaces();
  const secondWorkspace = verifyDeterminism
    ? await materializeSelectedWorkspaces()
    : firstWorkspace;
  const firstWorkspaceDigests = firstWorkspace.games.map(({ id, digest }) => ({
    id,
    digest,
  }));
  const secondWorkspaceDigests = secondWorkspace.games.map(
    ({ id, digest }) => ({ id, digest }),
  );
  if (
    JSON.stringify(firstWorkspaceDigests) !==
    JSON.stringify(secondWorkspaceDigests)
  ) {
    throw new Error(
      "Reference-game workspace generation is non-deterministic.",
    );
  }

  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-workbench-materialization-"),
  );
  const first = path.join(tempRoot, "first");
  const second = path.join(tempRoot, "second");
  try {
    const firstResult = await materializeProduct(first, {
      checkComponentIndex,
      gameIds: selectedGameIds,
    });
    let secondResult = firstResult;
    if (verifyDeterminism) {
      secondResult = await materializeProduct(second, {
        checkComponentIndex: false,
        gameIds: selectedGameIds,
      });
      if (firstResult.digest !== secondResult.digest) {
        throw new Error(
          `Workbench materialization is non-deterministic (${firstResult.digest} != ${secondResult.digest}).`,
        );
      }
    }

    const receipt = {
      schemaVersion: 2,
      generatedRoot: resolvedOutputRoot,
      digest: firstResult.digest,
      fixtureCount: firstResult.fixtureCount,
      scenarioCount: firstResult.scenarioCount,
      workspaceDigests: firstWorkspaceDigests,
      selectedGameIds,
      determinismMode: verifyDeterminism ? "fresh-double" : "single",
      materializerContractVersion: workbenchMaterializerContractVersion,
      cache: { hit: false, inputDigest },
    };
    await writeFile(
      path.join(first, "materialization-receipt.json"),
      `${JSON.stringify(receipt, null, 2)}\n`,
    );
    await replaceDirectoryAtomically(first, resolvedOutputRoot);
    if (useCache) {
      const cacheTemp = await mkdtemp(
        path.join(os.tmpdir(), "dreamboard-workbench-cache-write-"),
      );
      await cp(resolvedOutputRoot, cacheTemp, { recursive: true, force: true });
      await replaceDirectoryAtomically(cacheTemp, cacheEntry);
    }
    return receipt;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function readReusableReceipt(
  generatedRoot,
  { inputDigest, selectedGameIds, verifyDeterminism },
) {
  const receipt = await readFile(
    path.join(generatedRoot, "materialization-receipt.json"),
    "utf8",
  )
    .then(JSON.parse)
    .catch(() => null);
  if (
    !receipt ||
    receipt.schemaVersion !== 2 ||
    receipt.materializerContractVersion !==
      workbenchMaterializerContractVersion ||
    receipt.cache?.inputDigest !== inputDigest ||
    JSON.stringify(receipt.selectedGameIds) !==
      JSON.stringify(selectedGameIds) ||
    (verifyDeterminism && receipt.determinismMode !== "fresh-double") ||
    !(await stat(path.join(generatedRoot, "catalog.ts")).catch(() => null))
  ) {
    return null;
  }
  return { ...receipt, generatedRoot };
}

async function materializeProduct(
  generatedRoot,
  { checkComponentIndex, gameIds },
) {
  const fixtureBundleRoot = path.join(
    generatedRoot,
    "fixtures/reference-games",
  );
  const fixtures = await compileReferenceFixtures({
    outputRoot: fixtureBundleRoot,
    verifyDeterminism: false,
    gameIds,
  });
  await checkReferenceFixtures({ fixturesRoot: fixtureBundleRoot });
  const catalog = await generateScenarioCatalog({
    generatedRoot,
    checkComponentIndex,
  });
  const bundle = JSON.parse(
    await readFile(path.join(fixtureBundleRoot, "index.json"), "utf8"),
  );
  const availableIds = new Set(bundle.fixtures.map(({ id }) => id));
  const fullCatalog = gameIds.length === 0;
  const missingRequired = fullCatalog
    ? requiredWorkbenchScenarioIds.filter((id) => !availableIds.has(id))
    : [];
  if (missingRequired.length > 0) {
    throw new Error(
      `Required Workbench scenarios are missing: ${missingRequired.join(", ")}.`,
    );
  }
  const genericScenarioIds = bundle.fixtures
    .map(({ id }) => id)
    .filter((id) => id.startsWith("ui-scenarios."))
    .sort(compareCanonicalStrings);
  if (
    fullCatalog &&
    JSON.stringify(genericScenarioIds) !==
      JSON.stringify(requiredGenericUIScenarioIds)
  ) {
    throw new Error(
      `Generic UI scenario IDs must be exactly: ${requiredGenericUIScenarioIds.join(", ")}; found: ${genericScenarioIds.join(", ") || "(none)"}.`,
    );
  }
  return {
    fixtureCount: fixtures.fixtureCount,
    scenarioCount: catalog.scenarios,
    digest: await digestDirectory(generatedRoot),
  };
}

async function digestMaterializerInputs(gameIds) {
  const selected =
    gameIds.length > 0
      ? gameIds
      : expectedReferenceGames.map(({ id }) => id).concat("ui-scenarios");
  const roots = [
    path.join(root, "packages/sdk/dist"),
    path.join(root, "scripts/ui"),
    path.join(root, "scripts/ui-fixtures"),
    ...selected.map((gameId) =>
      gameId === "ui-scenarios"
        ? path.join(root, "examples/ui-scenarios")
        : path.join(root, "examples/reference-games", gameId),
    ),
  ];
  const digest = createHash("sha256").update(
    workbenchMaterializerContractVersion,
  );
  for (const directory of roots) {
    digest.update(directory);
    digest.update(await digestSourceDirectory(directory));
  }
  return `sha256:${digest.digest("hex")}`;
}

async function digestSourceDirectory(directory) {
  const records = [];
  const ignored = new Set(["node_modules", "build", "dist", ".turbo", ".git"]);
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((left, right) =>
      compareCanonicalStrings(left.name, right.name),
    )) {
      if (entry.isDirectory() && ignored.has(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) {
        const bytes = await readFile(absolute);
        records.push([
          path.relative(directory, absolute).split(path.sep).join("/"),
          createHash("sha256").update(bytes).digest("hex"),
        ]);
      }
    }
  }
  await visit(directory);
  return createHash("sha256").update(JSON.stringify(records)).digest("hex");
}

async function digestDirectory(directory) {
  const records = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((left, right) =>
      compareCanonicalStrings(left.name, right.name),
    )) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        const bytes = await readFile(absolute);
        records.push({
          path: path.relative(directory, absolute).split(path.sep).join("/"),
          sha256: createHash("sha256").update(bytes).digest("hex"),
          byteLength: bytes.length,
        });
      }
    }
  }
  await visit(directory);
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(records))
    .digest("hex")}`;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--out") {
      options.outputRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--no-determinism-check") {
      options.verifyDeterminism = false;
      continue;
    }
    if (arg === "--reuse-existing") {
      options.reuseExisting = true;
      continue;
    }
    if (arg === "--check-component-index") {
      options.checkComponentIndex = true;
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
  const result = await materializeWorkbench(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
