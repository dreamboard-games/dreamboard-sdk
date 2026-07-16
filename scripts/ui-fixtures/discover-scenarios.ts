import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  compareCanonicalStrings,
  discoverReferenceGames,
  expectRecord,
  hasErrorCode,
  readJson,
  referenceGamesRoot,
  root,
} from "../ui/support.ts";

const uiScenariosRoot = path.join(root, "examples/ui-scenarios");
const uiScenariosGame = {
  id: "ui-scenarios",
  displayName: "UI Primitive Scenarios",
  mechanics: ["ui-primitives"],
  uiPatterns: ["protocol-authority"],
};

export interface DiscoveredScenarioModule {
  readonly game: {
    readonly id: string;
    readonly displayName: string;
    readonly mechanics: readonly string[];
    readonly uiPatterns: readonly string[];
  };
  readonly gameDir: string;
  readonly modulePath: string;
}

async function collectScenarioModules(dir: string): Promise<string[]> {
  const modulePaths: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
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

async function collectReferenceScenarioModules(dir: string): Promise<string[]> {
  const modulePaths: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((left, right) =>
    compareCanonicalStrings(left.name, right.name),
  )) {
    const absolute = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`${absolute} must not be a symbolic link.`);
    }
    if (entry.isDirectory()) {
      if (["build", "dist", "generated", "node_modules"].includes(entry.name)) {
        throw new Error(`${absolute} is not an authored scenario directory.`);
      }
      modulePaths.push(...(await collectReferenceScenarioModules(absolute)));
    } else if (entry.isFile() && entry.name.endsWith(".scenario.ts")) {
      modulePaths.push(absolute);
    }
  }
  return modulePaths.sort(compareCanonicalStrings);
}

export async function discoverReferenceGameScenarioModules(): Promise<
  DiscoveredScenarioModule[]
> {
  const discovered: DiscoveredScenarioModule[] = [];
  for (const game of await discoverReferenceGames()) {
    const gameDir = path.join(referenceGamesRoot, game.id);
    const metadata = expectRecord(
      await readJson(path.join(gameDir, "reference-game.json")),
      `${game.id}/reference-game.json`,
    );
    if (metadata.schemaVersion !== 5) {
      throw new Error(
        `${game.id} must use reference-game.json schemaVersion 5 for UI fixture discovery.`,
      );
    }
    const modulePaths = await collectReferenceScenarioModules(
      path.join(gameDir, "test", "ui-scenarios"),
    );
    if (modulePaths.length === 0) {
      throw new Error(
        `${game.id} must provide at least one test/ui-scenarios/**/*.scenario.ts entry.`,
      );
    }
    for (const modulePath of modulePaths) {
      discovered.push({ game, gameDir, modulePath });
    }
  }
  return discovered;
}

export async function discoverUIScenarioModules(): Promise<
  DiscoveredScenarioModule[]
> {
  return (await collectScenarioModules(path.join(uiScenariosRoot, "src"))).map(
    (modulePath) => ({
      game: uiScenariosGame,
      gameDir: uiScenariosRoot,
      modulePath,
    }),
  );
}

export async function discoverAllScenarioModules(): Promise<
  DiscoveredScenarioModule[]
> {
  return [
    ...(await discoverReferenceGameScenarioModules()),
    ...(await discoverUIScenarioModules()),
  ].sort((left, right) =>
    compareCanonicalStrings(left.modulePath, right.modulePath),
  );
}
