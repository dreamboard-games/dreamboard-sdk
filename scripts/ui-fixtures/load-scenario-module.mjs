import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { referenceGamesRoot, root } from "../ui/reference-games-lib.mjs";

const examplesRoot = path.resolve(referenceGamesRoot);
const uiScenariosRoot = path.join(root, "examples/ui-scenarios");
const allowedSourceRoots = [
  examplesRoot,
  uiScenariosRoot,
  path.join(root, "packages/sdk/src"),
];
const tsxApiPath = path.join(
  root,
  "node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/esm/api/index.mjs",
);

let tsImport;

async function loadTsImport() {
  if (!tsImport) {
    if (!existsSync(tsxApiPath)) {
      throw new Error(`tsx ESM API was not found at ${tsxApiPath}.`);
    }
    ({ tsImport } = await import(pathToFileURL(tsxApiPath).href));
  }
  return tsImport;
}

async function importScenarioModule(absolutePath) {
  const specifier = `${pathToFileURL(absolutePath).href}?scenario=${Date.now()}`;
  if (/\.[cm]?tsx?$/.test(absolutePath)) {
    return (await loadTsImport())(specifier, { parentURL: import.meta.url });
  }
  return import(specifier);
}

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
  if (!Array.isArray(scenario.contracts)) {
    throw new Error(`${modulePath} scenario.contracts must be an array.`);
  }
  if (scenario.capabilities && !Array.isArray(scenario.capabilities)) {
    throw new Error(`${modulePath} scenario.capabilities must be an array.`);
  }
  if (scenario.replay && !Array.isArray(scenario.replay)) {
    throw new Error(`${modulePath} scenario.replay must be an array.`);
  }
  if (!scenario.authority) {
    if (!scenario.behaviorScenario) {
      throw new Error(
        `${modulePath} v2 workspace scenarios must include behaviorScenario or authority.`,
      );
    }
    return;
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
  const coverageScenarioId =
    scenario.authority.coverage.scenarioId ?? scenario.authority.coverage.id;
  if (
    typeof coverageScenarioId === "string" &&
    coverageScenarioId !== scenario.id &&
    !scenario.id.startsWith(`${coverageScenarioId}.`)
  ) {
    throw new Error(
      `${modulePath} scenario.id must match or extend authority.coverage.scenarioId.`,
    );
  }
  if (
    scenario.authority.referenceGame.id &&
    scenario.authority.referenceGame.id !== gameId
  ) {
    throw new Error(
      `${modulePath} scenario.gameId must match authority.referenceGame.id.`,
    );
  }
}

export async function loadScenarioModule(modulePath) {
  const absolutePath = path.resolve(modulePath);
  if (
    !isWithin(absolutePath, examplesRoot) &&
    !isWithin(absolutePath, uiScenariosRoot)
  ) {
    throw new Error(
      `${modulePath} is outside ${examplesRoot} and ${uiScenariosRoot}.`,
    );
  }
  const module = await importScenarioModule(absolutePath);
  const scenario = module.scenario ?? module.default;
  validateScenarioDefinition(scenario, modulePath);
  return {
    ...scenario,
    __modulePath: absolutePath,
    gameId: scenario.gameId ?? scenario.authority?.referenceGame?.id,
  };
}
