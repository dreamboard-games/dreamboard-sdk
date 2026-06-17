#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  componentScenarioIndexPath,
  readReferenceFixtureBundleIndex,
  repoRelative,
  root,
  sortUnique,
} from "./scenario-catalog-lib.mjs";

const sharedScenarioPrefixes = [
  "packages/sdk/src/runtime/",
  "packages/sdk/src/testing/ui-fixture/",
  "packages/ui-workbench/src/runtime/",
  "packages/ui-workbench/src/catalog/",
];

const sharedScenarioFiles = new Set([
  "packages/sdk/src/browser-interaction.ts",
  "packages/sdk/src/runtime.ts",
  "packages/sdk/src/testing.ts",
  "packages/sdk/src/ui/plugin-styles.css",
]);

const sharedThemePrefixes = ["packages/sdk/src/ui/theme/"];

function normalizePath(value) {
  return value.split(path.sep).join("/").replace(/^\.\//, "");
}

function isSharedScenarioFile(file) {
  return (
    sharedScenarioFiles.has(file) ||
    sharedScenarioPrefixes.some((prefix) => file.startsWith(prefix)) ||
    sharedThemePrefixes.some((prefix) => file.startsWith(prefix))
  );
}

async function allScenarioIdsFromBundle() {
  const bundle = await readReferenceFixtureBundleIndex();
  return sortUnique((bundle.fixtures ?? []).map((entry) => entry.id));
}

export async function selectImpactedUIScenarios({
  changedFiles,
  componentScenarioIndex,
  allScenarioIds,
}) {
  const normalizedChangedFiles = sortUnique(changedFiles.map(normalizePath));
  const sourceOwners = new Map();
  for (const [componentName, component] of Object.entries(
    componentScenarioIndex.components ?? {},
  )) {
    for (const sourceFile of component.sourceFiles ?? []) {
      const owners = sourceOwners.get(sourceFile) ?? [];
      owners.push(componentName);
      sourceOwners.set(sourceFile, owners);
    }
  }

  const selectedScenarios = new Set();
  const selectedStoryIds = new Set();
  const changedComponents = new Set();
  const unmappedFiles = [];
  const reasons = [];
  const allScenarios = sortUnique(
    allScenarioIds ??
      Object.values(componentScenarioIndex.components ?? {}).flatMap(
        (component) => component.scenarioIds ?? [],
      ),
  );

  for (const changedFile of normalizedChangedFiles) {
    if (isSharedScenarioFile(changedFile)) {
      for (const scenarioId of allScenarios) {
        selectedScenarios.add(scenarioId);
      }
      reasons.push({
        changedFile,
        kind: "shared-ui-runtime",
        scenarioIds: allScenarios,
      });
      continue;
    }

    const owners = sortUnique(sourceOwners.get(changedFile) ?? []);
    if (owners.length === 0) {
      unmappedFiles.push(changedFile);
      continue;
    }

    const scenarioIds = new Set();
    const storyIds = new Set();
    for (const componentName of owners) {
      changedComponents.add(componentName);
      const component = componentScenarioIndex.components[componentName];
      for (const scenarioId of component.scenarioIds ?? []) {
        selectedScenarios.add(scenarioId);
        scenarioIds.add(scenarioId);
      }
      for (const storyId of component.storyIds ?? []) {
        selectedStoryIds.add(storyId);
        storyIds.add(storyId);
      }
    }
    reasons.push({
      changedFile,
      kind: "component-source",
      componentNames: owners,
      scenarioIds: sortUnique(scenarioIds),
      storyIds: sortUnique(storyIds),
    });
  }

  const fullSuite = unmappedFiles.length > 0;
  if (fullSuite) {
    for (const scenarioId of allScenarios) {
      selectedScenarios.add(scenarioId);
    }
  }

  return {
    schemaVersion: 1,
    fullSuite,
    changedFiles: normalizedChangedFiles,
    changedComponents: sortUnique(changedComponents),
    selectedScenarios: sortUnique(selectedScenarios),
    selectedStoryIds: sortUnique(selectedStoryIds),
    unmappedFiles: sortUnique(unmappedFiles),
    reasons,
  };
}

export async function writeSelectionArtifact(filePath, selection) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(selection, null, 2)}\n`);
}

async function main() {
  let outputPath = "artifacts/ui/selection.json";
  const changedFiles = [];
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--output") {
      outputPath = args[index + 1];
      if (!outputPath) {
        throw new Error("--output requires a path.");
      }
      index += 1;
      continue;
    }
    changedFiles.push(arg);
  }
  if (changedFiles.length === 0) {
    throw new Error("Pass changed files to select impacted UI scenarios.");
  }
  const componentScenarioIndex = JSON.parse(
    await readFile(componentScenarioIndexPath, "utf8"),
  );
  const selection = await selectImpactedUIScenarios({
    changedFiles,
    componentScenarioIndex,
    allScenarioIds: await allScenarioIdsFromBundle(),
  });
  const absoluteOutput = path.resolve(root, outputPath);
  await writeSelectionArtifact(absoluteOutput, selection);
  console.log(`wrote ${repoRelative(absoluteOutput)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
