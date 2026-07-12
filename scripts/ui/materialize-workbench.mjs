#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { compileReferenceFixtures } from "../ui-fixtures/compile-reference-fixtures.mjs";
import { checkReferenceFixtures } from "../ui-fixtures/check-fixtures.mjs";
import { materializeReferenceGameWorkspaces } from "../reference-games/materialize-workspace.mjs";
import { generateScenarioCatalog } from "./generate-scenario-catalog.mjs";
import { requiredWorkbenchScenarioIds } from "./required-ui-scenarios.mjs";
import { compareCanonicalStrings, root } from "./reference-games-lib.mjs";

export const defaultGeneratedWorkbenchRoot = path.join(
  root,
  "build/ui-workbench/generated",
);

export async function materializeWorkbench({
  outputRoot = defaultGeneratedWorkbenchRoot,
  verifyDeterminism = true,
  checkComponentIndex = false,
} = {}) {
  const resolvedOutputRoot = path.resolve(outputRoot);
  const firstWorkspace = await materializeReferenceGameWorkspaces();
  const secondWorkspace = verifyDeterminism
    ? await materializeReferenceGameWorkspaces()
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
    });
    let secondResult = firstResult;
    if (verifyDeterminism) {
      secondResult = await materializeProduct(second, {
        checkComponentIndex: false,
      });
      if (firstResult.digest !== secondResult.digest) {
        throw new Error(
          `Workbench materialization is non-deterministic (${firstResult.digest} != ${secondResult.digest}).`,
        );
      }
    }

    await rm(resolvedOutputRoot, { recursive: true, force: true });
    await mkdir(path.dirname(resolvedOutputRoot), { recursive: true });
    await cp(first, resolvedOutputRoot, { recursive: true });
    const receipt = {
      schemaVersion: 1,
      generatedRoot: resolvedOutputRoot,
      digest: firstResult.digest,
      fixtureCount: firstResult.fixtureCount,
      scenarioCount: firstResult.scenarioCount,
      workspaceDigests: firstWorkspaceDigests,
    };
    await writeFile(
      path.join(resolvedOutputRoot, "materialization-receipt.json"),
      `${JSON.stringify(receipt, null, 2)}\n`,
    );
    return receipt;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function materializeProduct(generatedRoot, { checkComponentIndex }) {
  const fixtureBundleRoot = path.join(
    generatedRoot,
    "fixtures/reference-games",
  );
  const fixtures = await compileReferenceFixtures({
    outputRoot: fixtureBundleRoot,
    verifyDeterminism: false,
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
  const missingRequired = requiredWorkbenchScenarioIds.filter(
    (id) => !availableIds.has(id),
  );
  if (missingRequired.length > 0) {
    throw new Error(
      `Required Workbench scenarios are missing: ${missingRequired.join(", ")}.`,
    );
  }
  return {
    fixtureCount: fixtures.fixtureCount,
    scenarioCount: catalog.scenarios,
    digest: await digestDirectory(generatedRoot),
  };
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
    if (arg === "--out") {
      options.outputRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--no-determinism-check") {
      options.verifyDeterminism = false;
      continue;
    }
    if (arg === "--check-component-index") {
      options.checkComponentIndex = true;
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
