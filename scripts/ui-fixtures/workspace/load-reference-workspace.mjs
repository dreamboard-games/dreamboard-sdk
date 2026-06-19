import { pathToFileURL } from "node:url";
import path from "node:path";
import { readJson } from "../../ui/reference-games-lib.mjs";

export async function loadReferenceGameWorkspace(gameRoot) {
  const root = path.resolve(gameRoot);
  const metadata = await readJson(path.join(root, "reference-game.json"));
  if (metadata.schemaVersion !== 2) {
    throw new Error(
      `${path.relative(process.cwd(), root)} reference-game.json must use schemaVersion 2.`,
    );
  }
  const workspace = metadata.workspace;
  if (!workspace || typeof workspace !== "object") {
    throw new Error(
      `${metadata.id}: reference-game.json must declare workspace.`,
    );
  }

  const reducerPath = resolveWorkspacePath(root, workspace.reducer, "reducer");
  const uiEntry = resolveWorkspacePath(root, workspace.ui, "ui");
  const behaviorScenarioPaths = workspace.behaviorScenarios.map((entry) =>
    resolveWorkspacePath(root, entry, "behaviorScenarios"),
  );
  const uiScenarioPaths = workspace.uiScenarios.map((entry) =>
    resolveWorkspacePath(root, entry, "uiScenarios"),
  );

  const reducerModule = await importModule(reducerPath);
  const reducerBundle =
    reducerModule.reducerBundle ??
    reducerModule.bundle ??
    reducerModule.default?.reducerBundle ??
    reducerModule.default;
  if (!reducerBundle || typeof reducerBundle !== "object") {
    throw new Error(
      `${metadata.id}: ${workspace.reducer} must export a reducer bundle.`,
    );
  }

  const behaviorScenarios = new Map();
  for (const scenarioPath of behaviorScenarioPaths) {
    const scenario = await loadScenario(scenarioPath, "behavior scenario");
    const id = scenario.id;
    if (behaviorScenarios.has(id)) {
      throw new Error(`${metadata.id}: duplicated behavior scenario id ${id}.`);
    }
    behaviorScenarios.set(id, scenario);
  }

  const behaviorScenarioValues = new Set(behaviorScenarios.values());
  const uiScenarios = new Map();
  for (const scenarioPath of uiScenarioPaths) {
    const scenario = await loadScenario(scenarioPath, "UI scenario");
    if (!behaviorScenarioValues.has(scenario.behaviorScenario)) {
      throw new Error(
        `${metadata.id}: UI scenario ${scenario.id} must reference a behavior scenario from the same workspace.`,
      );
    }
    if (uiScenarios.has(scenario.id)) {
      throw new Error(
        `${metadata.id}: duplicated UI scenario id ${scenario.id}.`,
      );
    }
    uiScenarios.set(scenario.id, scenario);
  }

  return {
    metadata,
    reducerBundle,
    uiEntry,
    behaviorScenarios,
    uiScenarios,
  };
}

function resolveWorkspacePath(gameRoot, entry, label) {
  if (typeof entry !== "string" || entry.length === 0) {
    throw new Error(`workspace.${label} entries must be non-empty strings.`);
  }
  if (path.isAbsolute(entry)) {
    throw new Error(`workspace.${label} entry ${entry} must be relative.`);
  }
  const absolute = path.resolve(gameRoot, entry);
  const relative = path.relative(gameRoot, absolute);
  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`workspace.${label} entry ${entry} escapes the game root.`);
  }
  return absolute;
}

async function importModule(filePath) {
  return import(`${pathToFileURL(filePath).href}?workspace=${Date.now()}`);
}

async function loadScenario(filePath, label) {
  const module = await importModule(filePath);
  const scenario = module.scenario ?? module.default;
  if (!scenario || typeof scenario !== "object") {
    throw new Error(`${filePath} must export a ${label} object.`);
  }
  if (typeof scenario.id !== "string" || scenario.id.length === 0) {
    throw new Error(`${filePath} ${label} must declare id.`);
  }
  return scenario;
}
