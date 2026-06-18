import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  expectedReferenceGames,
  referenceGamesRoot,
} from "../ui/reference-games-lib.mjs";

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
