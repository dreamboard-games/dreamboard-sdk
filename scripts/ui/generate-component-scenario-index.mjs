#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "prettier";
import {
  compareCanonicalStrings,
  componentScenarioIndexPath,
  repoRelative,
  root,
  sortUnique,
  throwCatalogError,
  writeGeneratedText,
} from "./scenario-catalog-lib.mjs";
import { collectUIContracts } from "./ui-contracts-lib.mjs";

const sharedFallbacks = [
  "packages/sdk/src/browser-interaction.ts",
  "packages/sdk/src/browser-interaction/**",
  "packages/sdk/src/runtime/**",
  "packages/sdk/src/testing/ui-fixture/**",
  "packages/sdk/src/testing/ui-scenario/**",
  "packages/sdk/src/ui/plugin-styles.css",
  "packages/sdk/src/ui/theme/**",
  "packages/ui-workbench/src/runtime/**",
];

function validateSourceFiles(label, sourceFiles, errors) {
  if (!Array.isArray(sourceFiles) || sourceFiles.length === 0) {
    errors.push(`${label}: missing sourceFiles`);
    return;
  }
  for (const sourceFile of sourceFiles) {
    if (
      path.isAbsolute(sourceFile) ||
      sourceFile.split(/[\\/]+/).includes("..")
    ) {
      errors.push(`${label}: source file must be repo-relative: ${sourceFile}`);
      continue;
    }
    if (
      !/[*?[\]{}]/.test(sourceFile) &&
      !existsSync(path.join(root, sourceFile))
    ) {
      errors.push(`${label}: missing source file ${sourceFile}`);
    }
  }
}

function scenarioCapabilityIsExercised(entry, capability) {
  const replayKinds = new Set(entry.replayStepKinds ?? []);
  const expectationKeys = new Set(entry.replayExpectationKeys ?? []);
  switch (capability) {
    case "accessibility-scan":
    case "reduced-motion":
      return (entry.replayStepCount ?? 0) > 0;
    case "click":
      return replayKinds.has("activate");
    case "keyboard":
      return replayKinds.has("activate") || replayKinds.has("fill");
    case "pointer-drag":
    case "desktop-drag":
    case "touch-drag":
      return replayKinds.has("drag");
    case "runtime-draft":
      return (
        replayKinds.has("fill") ||
        replayKinds.has("drag") ||
        (entry.replayStepCount ?? 0) > 1 ||
        expectationKeys.has("draftDigest")
      );
    case "runtime-submit":
      return expectationKeys.has("submissionDigest");
    case "responsive-layout":
      return (entry.viewportTags ?? []).length > 0;
    default:
      return false;
  }
}

function validateScenarioEntries(entries, contracts) {
  const errors = [];
  const contractIds = new Set(contracts.map((contract) => contract.id));
  const scenarioIds = new Set();
  for (const entry of entries) {
    if (scenarioIds.has(entry.id)) {
      errors.push(`duplicate scenario id ${entry.id}`);
    }
    scenarioIds.add(entry.id);
    validateSourceFiles(entry.id, entry.sourceFiles, errors);
    for (const contractId of entry.components ?? []) {
      if (!contractIds.has(contractId)) {
        errors.push(`${entry.id}: unknown contract ${contractId}`);
      }
    }
    for (const capability of entry.capabilities ?? []) {
      if (!scenarioCapabilityIsExercised(entry, capability)) {
        errors.push(
          `${entry.id}: capability ${capability} has no matching replay step`,
        );
      }
    }
  }
  if (errors.length > 0) {
    throwCatalogError(errors);
  }
}

function buildScenarioIndex(entries) {
  return Object.fromEntries(
    entries.map((entry) => [
      entry.id,
      {
        id: entry.id,
        title: entry.title,
        gameId: entry.gameId,
        sourceFiles: sortUnique(entry.sourceFiles ?? []),
        contracts: sortUnique(entry.components ?? []),
        capabilities: sortUnique(entry.capabilities ?? []),
        viewportTags: sortUnique(entry.viewportTags ?? []),
        fixtureFile: entry.fixtureFile,
        renderModule: entry.renderModule,
        fixtureDigest: entry.fixtureDigest,
        renderModuleDigest: entry.renderModuleDigest,
      },
    ]),
  );
}

function buildContractIndex({ contracts, entries }) {
  const scenarioIdsByContract = new Map();
  const capabilitiesByContract = new Map();
  for (const entry of entries) {
    for (const contractId of entry.components ?? []) {
      scenarioIdsByContract.set(contractId, [
        ...(scenarioIdsByContract.get(contractId) ?? []),
        entry.id,
      ]);
      capabilitiesByContract.set(contractId, [
        ...(capabilitiesByContract.get(contractId) ?? []),
        ...(entry.capabilities ?? []),
      ]);
    }
  }
  return Object.fromEntries(
    [...contracts]
      .sort((left, right) =>
        compareCanonicalStrings(left.id, right.id),
      )
      .map((contract) => [
        contract.id,
        {
          id: contract.id,
          kind: contract.kind,
          owner: contract.owner,
          publicExport: contract.publicExport,
          sourceFiles: sortUnique(contract.sourceFiles),
          storyIds: sortUnique(contract.storyIds ?? []),
          requiredCapabilities: sortUnique(contract.requiredCapabilities ?? []),
          scenarioIds: sortUnique(scenarioIdsByContract.get(contract.id) ?? []),
          capabilities: sortUnique(
            capabilitiesByContract.get(contract.id) ?? [],
          ),
        },
      ]),
  );
}

export async function generateComponentScenarioIndex({
  check = false,
  entries,
} = {}) {
  if (!entries) {
    const { collectValidatedScenarioCatalog } =
      await import("./scenario-catalog-lib.mjs");
    entries = await collectValidatedScenarioCatalog();
  }
  const contracts = await collectUIContracts();
  validateScenarioEntries(entries, contracts);

  const contractIndex = buildContractIndex({ contracts, entries });
  const index = {
    schemaVersion: 2,
    contracts: contractIndex,
    scenarios: buildScenarioIndex(entries),
    sharedFallbacks,
  };

  return writeGeneratedText(
    componentScenarioIndexPath,
    await format(JSON.stringify(index), { parser: "json" }),
    { check },
  );
}

async function main() {
  const check = process.argv.includes("--check");
  await generateComponentScenarioIndex({ check });
  console.log(
    `${check ? "checked" : "generated"} ${repoRelative(
      componentScenarioIndexPath,
    )}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
