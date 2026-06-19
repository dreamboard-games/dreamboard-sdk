import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  componentScenarioIndexPath,
  formatList,
  root,
  sortUnique,
} from "./scenario-catalog-lib.mjs";

export const smokeWorkbenchScenarioIds = [
  "hearts.pass-three.mobile",
  "hex-network-trading.build-trail.desktop",
  "worker-placement-tableau.place-worker.desktop",
];

const ownedUIFallbackPrefixes = [
  "examples/ui-scenarios/",
  "packages/sdk/src/testing/ui-scenario/",
  "packages/sdk/src/ui/",
  "packages/ui-workbench/src/",
  "packages/ui-workbench/tests/",
  "scripts/ui/",
  "scripts/ui-fixtures/",
];

export async function readComponentScenarioIndex(
  indexPath = componentScenarioIndexPath,
) {
  return JSON.parse(await readFile(indexPath, "utf8"));
}

export function scenariosForContract(index, contractId) {
  return sortUnique(index.contracts?.[contractId]?.scenarioIds ?? []);
}

export function scenariosForCapability(index, capability) {
  return Object.values(index.scenarios ?? {})
    .filter((scenario) => scenario.capabilities?.includes(capability))
    .map((scenario) => scenario.id)
    .sort();
}

export function scenarioById(index, scenarioId) {
  return index.scenarios?.[scenarioId];
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function stripGlobPrefix(value) {
  const marker = value.search(/[*?[\]{}]/);
  const prefix = marker === -1 ? value : value.slice(0, marker);
  return prefix.replace(/[^/]*$/, "");
}

function sourceMatches(pattern, sourceFile) {
  const normalizedPattern = normalizePath(pattern);
  const normalizedSource = normalizePath(sourceFile);
  if (normalizedPattern === normalizedSource) {
    return true;
  }
  if (!/[*?[\]{}]/.test(normalizedPattern)) {
    return false;
  }
  const prefix = stripGlobPrefix(normalizedPattern);
  return prefix.length > 0 && normalizedSource.startsWith(prefix);
}

export function selectScenariosForSourceFiles(index, sourceFiles) {
  const reasons = [];
  const scenarioIds = new Set();
  const contractIds = new Set();
  const normalizedFiles = sourceFiles.map((file) =>
    normalizePath(path.relative(root, path.resolve(root, file))),
  );

  for (const file of normalizedFiles) {
    let matched = false;
    for (const scenario of Object.values(index.scenarios ?? {})) {
      if (
        (scenario.sourceFiles ?? []).some((pattern) =>
          sourceMatches(pattern, file),
        )
      ) {
        matched = true;
        scenarioIds.add(scenario.id);
        reasons.push({
          file,
          reason: "scenario-source",
          scenarioId: scenario.id,
        });
      }
    }
    for (const contract of Object.values(index.contracts ?? {})) {
      if (
        (contract.sourceFiles ?? []).some((pattern) =>
          sourceMatches(pattern, file),
        )
      ) {
        matched = true;
        contractIds.add(contract.id);
        for (const scenarioId of contract.scenarioIds ?? []) {
          scenarioIds.add(scenarioId);
        }
        reasons.push({
          file,
          reason: "contract-source",
          contractId: contract.id,
          scenarioIds: contract.scenarioIds ?? [],
        });
      }
    }
    if (
      (index.sharedFallbacks ?? []).some((pattern) =>
        sourceMatches(pattern, file),
      )
    ) {
      matched = true;
      for (const scenarioId of smokeWorkbenchScenarioIds) {
        scenarioIds.add(scenarioId);
      }
      reasons.push({
        file,
        reason: "shared-fallback",
        scenarioIds: smokeWorkbenchScenarioIds,
      });
    }
    if (
      !matched &&
      ownedUIFallbackPrefixes.some((prefix) => file.startsWith(prefix))
    ) {
      for (const scenarioId of smokeWorkbenchScenarioIds) {
        scenarioIds.add(scenarioId);
      }
      reasons.push({
        file,
        reason: "unknown-owned-ui-source",
        scenarioIds: smokeWorkbenchScenarioIds,
      });
    }
  }

  return {
    contractIds: [...contractIds].sort(),
    scenarioIds: [...scenarioIds].sort(),
    reasons,
  };
}

export function assertKnownScenarioSelection(index, scenarioIds) {
  const missing = scenarioIds.filter((id) => !index.scenarios?.[id]);
  if (missing.length > 0) {
    throw new Error(`Unknown UI scenarios: ${formatList(missing)}`);
  }
}
