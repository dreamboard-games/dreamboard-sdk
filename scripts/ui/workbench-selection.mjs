import path from "node:path";

import {
  readComponentScenarioIndex,
  scenariosForCapability,
  scenariosForContract,
  selectScenariosForSourceFiles,
} from "./component-scenario-index-lib.mjs";
import { expectedReferenceGameIds, root } from "./reference-games-lib.mjs";
import { requiredWorkbenchScenarioIds } from "./required-ui-scenarios.mjs";

export function gameIdForScenarioId(scenarioId, index) {
  return (
    index.scenarios?.[scenarioId]?.gameId ??
    expectedReferenceGameIds.find((gameId) =>
      scenarioId.startsWith(`${gameId}.`),
    ) ??
    (scenarioId.startsWith("ui-scenarios.") ? "ui-scenarios" : undefined)
  );
}

export function gameIdsForScenarioIds(scenarioIds, index) {
  const unknown = [];
  const gameIds = new Set();
  for (const scenarioId of scenarioIds) {
    const gameId = gameIdForScenarioId(scenarioId, index);
    if (gameId) gameIds.add(gameId);
    else unknown.push(scenarioId);
  }
  if (unknown.length > 0) {
    throw new Error(
      `Cannot resolve the owning game for UI scenarios: ${unknown.join(", ")}.`,
    );
  }
  return [...gameIds].sort();
}

export async function selectWorkbenchSources(
  options,
  { changedFiles = [] } = {},
) {
  const index = await readComponentScenarioIndex();
  let scenarioIds;
  if (options.required) {
    scenarioIds = [...requiredWorkbenchScenarioIds];
  } else if (options.scenario) {
    scenarioIds = [options.scenario];
  } else if (options.component) {
    scenarioIds = scenariosForContract(index, options.component);
  } else if (options.capability) {
    scenarioIds = scenariosForCapability(index, options.capability);
  } else if (options.changed) {
    scenarioIds = selectScenariosForSourceFiles(
      index,
      changedFiles,
    ).scenarioIds;
  } else {
    return { index, scenarioIds: [], gameIds: [], focused: false };
  }

  return {
    index,
    scenarioIds,
    gameIds: gameIdsForScenarioIds(scenarioIds, index),
    focused: true,
  };
}

export function watchedRootsForGameIds(
  gameIds,
  { includeSdkSource = false } = {},
) {
  const roots = gameIds
    .filter((gameId) => expectedReferenceGameIds.includes(gameId))
    .map((gameId) => path.join(root, "examples/reference-games", gameId));
  if (gameIds.includes("ui-scenarios")) {
    roots.push(path.join(root, "examples/ui-scenarios"));
  }
  if (includeSdkSource) roots.push(path.join(root, "packages/sdk/src"));
  return roots;
}
