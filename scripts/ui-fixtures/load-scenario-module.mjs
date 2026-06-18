import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { referenceGamesRoot } from "../ui/reference-games-lib.mjs";

const examplesRoot = path.resolve(referenceGamesRoot);

function isWithin(child, parent) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function assertObject(value, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
}

function validateScenarioDefinition(scenario, modulePath) {
  assertObject(scenario, `${modulePath} must export a scenario object.`);
  if (typeof scenario.id !== "string" || scenario.id.length === 0) {
    throw new Error(`${modulePath} scenario.id must be a non-empty string.`);
  }
  assertObject(
    scenario.authority,
    `${modulePath} scenario.authority must be an object.`,
  );
  if (scenario.authority.kind !== "reducer") {
    throw new Error(`${modulePath} scenario.authority.kind must be 'reducer'.`);
  }
  assertObject(
    scenario.authority.referenceGame,
    `${modulePath} reducer authority must include referenceGame.`,
  );
  const gameId = scenario.gameId ?? scenario.authority.referenceGame.id;
  if (typeof gameId !== "string" || gameId.length === 0) {
    throw new Error(
      `${modulePath} scenario.gameId or authority.referenceGame.id must be a non-empty string.`,
    );
  }
  assertObject(
    scenario.authority.coverage,
    `${modulePath} reducer authority must include coverage.`,
  );
  if (scenario.authority.coverage.scenarioId !== scenario.id) {
    throw new Error(
      `${modulePath} scenario.id must match authority.coverage.scenarioId.`,
    );
  }
  if (scenario.authority.referenceGame.id !== gameId) {
    throw new Error(
      `${modulePath} scenario.gameId must match authority.referenceGame.id.`,
    );
  }
}

export async function loadScenarioModule(modulePath) {
  const absolutePath = path.resolve(modulePath);
  if (!isWithin(absolutePath, examplesRoot)) {
    throw new Error(`${modulePath} is outside ${examplesRoot}.`);
  }
  const module = await import(
    `${pathToFileURL(absolutePath).href}?scenario=${Date.now()}`
  );
  const scenario = module.scenario ?? module.default;
  validateScenarioDefinition(scenario, modulePath);
  return {
    ...scenario,
    gameId: scenario.gameId ?? scenario.authority.referenceGame.id,
  };
}
