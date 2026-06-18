import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  expectedReferenceGames,
  referenceGamesRoot,
  root,
} from "../ui/reference-games-lib.mjs";

const uiScenariosRoot = path.join(root, "examples/ui-scenarios");
const uiScenariosGame = {
  id: "ui-scenarios",
  displayName: "UI Primitive Scenarios",
  mechanics: ["ui-primitives"],
  uiPatterns: ["protocol-authority"],
};

async function collectScenarioModules(dir) {
  const modulePaths = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return modulePaths;
    }
    throw error;
  }
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      modulePaths.push(...(await collectScenarioModules(absolute)));
    } else if (entry.isFile() && entry.name.endsWith(".scenario.mjs")) {
      modulePaths.push(absolute);
    }
  }
  return modulePaths.sort();
}

export async function discoverReferenceGameScenarioModules() {
  const discovered = [];
  for (const game of expectedReferenceGames) {
    const gameDir = path.join(referenceGamesRoot, game.id);
    const scenarioDir = path.join(gameDir, "src/scenarios");
    let entries;
    try {
      entries = await readdir(scenarioDir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw new Error(
          `${game.id} must provide at least one src/scenarios/*.scenario.mjs module.`,
        );
      }
      throw error;
    }
    const modulePaths = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".scenario.mjs"))
      .map((entry) => path.join(scenarioDir, entry.name))
      .sort();
    if (modulePaths.length === 0) {
      throw new Error(
        `${game.id} must provide at least one src/scenarios/*.scenario.mjs module.`,
      );
    }
    for (const modulePath of modulePaths) {
      discovered.push({ game, gameDir, modulePath });
    }
  }
  return discovered;
}

export async function discoverUIScenarioModules() {
  return (await collectScenarioModules(path.join(uiScenariosRoot, "src"))).map(
    (modulePath) => ({
      game: uiScenariosGame,
      gameDir: uiScenariosRoot,
      modulePath,
    }),
  );
}

export async function discoverAllScenarioModules() {
  return [
    ...(await discoverReferenceGameScenarioModules()),
    ...(await discoverUIScenarioModules()),
  ].sort((left, right) => left.modulePath.localeCompare(right.modulePath));
}
