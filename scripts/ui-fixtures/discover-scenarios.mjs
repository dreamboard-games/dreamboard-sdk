import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  expectedReferenceGames,
  readJson,
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
    const metadata = await readJson(path.join(gameDir, "reference-game.json"));
    if (metadata.schemaVersion !== 3) {
      throw new Error(
        `${game.id} must use reference-game.json schemaVersion 3 for UI fixture discovery.`,
      );
    }
    const uiScenarios = metadata.workspace?.uiScenarios;
    if (!Array.isArray(uiScenarios)) {
      throw new Error(
        `${game.id} must declare reference-game.json workspace.uiScenarios.`,
      );
    }
    const modulePaths = uiScenarios
      .map((entry) => {
        if (typeof entry !== "string" || path.isAbsolute(entry)) {
          throw new Error(
            `${game.id} workspace.uiScenarios entries must be relative strings.`,
          );
        }
        const absolute = path.resolve(gameDir, entry);
        const relative = path.relative(gameDir, absolute);
        if (
          relative === "" ||
          relative.startsWith("..") ||
          path.isAbsolute(relative)
        ) {
          throw new Error(
            `${game.id} workspace.uiScenarios entry ${entry} escapes the game root.`,
          );
        }
        return absolute;
      })
      .sort();
    if (modulePaths.length === 0) {
      throw new Error(
        `${game.id} must provide at least one workspace.uiScenarios entry.`,
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
