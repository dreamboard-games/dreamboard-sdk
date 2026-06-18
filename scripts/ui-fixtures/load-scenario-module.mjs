import path from "node:path";
import { pathToFileURL } from "node:url";
import { referenceGamesRoot, root } from "../ui/reference-games-lib.mjs";

const examplesRoot = path.resolve(referenceGamesRoot);
const allowedSourceRoots = [examplesRoot, path.join(root, "packages/sdk/src")];

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
  if (!Array.isArray(scenario.sourceFiles)) {
    throw new Error(`${modulePath} scenario.sourceFiles must be an array.`);
  }
  for (const sourceFile of scenario.sourceFiles) {
    if (typeof sourceFile !== "string" || sourceFile.length === 0) {
      throw new Error(
        `${modulePath} scenario.sourceFiles entries must be non-empty strings.`,
      );
    }
    const sourcePath = path.resolve(root, sourceFile);
    if (
      !allowedSourceRoots.some((sourceRoot) => isWithin(sourcePath, sourceRoot))
    ) {
      throw new Error(
        `${modulePath} source file '${sourceFile}' is outside allowed UI scenario roots.`,
      );
    }
  }
  assertObject(
    scenario.authority,
    `${modulePath} scenario.authority must be an object.`,
  );
  if (
    scenario.authority.kind !== "reducer" &&
    scenario.authority.kind !== "protocol"
  ) {
    throw new Error(
      `${modulePath} scenario.authority.kind must be 'reducer' or 'protocol'.`,
    );
  }
  if (scenario.authority.kind === "protocol") {
    if (typeof scenario.gameId !== "string" || scenario.gameId.length === 0) {
      throw new Error(
        `${modulePath} protocol authority scenarios must include scenario.gameId.`,
      );
    }
    assertObject(
      scenario.authority.tape,
      `${modulePath} protocol authority must include tape.`,
    );
    if (!Array.isArray(scenario.replay)) {
      throw new Error(`${modulePath} protocol authority must include replay.`);
    }
    return;
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
  assertObject(
    scenario.authority.bundle,
    `${modulePath} reducer authority must include bundle.`,
  );
  assertObject(
    scenario.authority.initialState,
    `${modulePath} reducer authority must include initialState.`,
  );
  assertObject(
    scenario.authority.viewer,
    `${modulePath} reducer authority must include viewer.`,
  );
  if (!Array.isArray(scenario.authority.operations)) {
    throw new Error(
      `${modulePath} reducer authority must include operations array.`,
    );
  }
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
    gameId: scenario.gameId ?? scenario.authority.referenceGame?.id,
  };
}
