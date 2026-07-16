import { pathToFileURL } from "node:url";
import path from "node:path";
import { expectRecord, readJson } from "../../ui/support.ts";

type DynamicRecord = Record<string, any>;

export interface ReferenceGameWorkspace {
  readonly metadata: DynamicRecord;
  readonly reducerBundle: DynamicRecord;
  readonly uiEntry: string;
  readonly behaviorScenarios: ReadonlyMap<string, DynamicRecord>;
  readonly uiScenarios: ReadonlyMap<string, DynamicRecord>;
}

export async function loadReferenceGameWorkspace(
  gameRoot: string,
): Promise<ReferenceGameWorkspace> {
  const root = path.resolve(gameRoot);
  const metadata = expectRecord(
    await readJson(path.join(root, "reference-game.json")),
    `${gameRoot}/reference-game.json`,
  ) as DynamicRecord;
  if (metadata.schemaVersion !== 5) {
    throw new Error(
      `${path.relative(process.cwd(), root)} reference-game.json must use schemaVersion 5.`,
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
  const behaviorScenarioPaths = await collectScenarioPaths(
    root,
    "test/scenarios",
  );
  const uiScenarioPaths = await collectScenarioPaths(root, "test/ui-scenarios");

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

  const behaviorScenarios = new Map<string, DynamicRecord>();
  for (const scenarioPath of behaviorScenarioPaths) {
    const scenario = await loadScenario(scenarioPath, "behavior scenario");
    const id = scenario.id;
    if (behaviorScenarios.has(id)) {
      throw new Error(`${metadata.id}: duplicated behavior scenario id ${id}.`);
    }
    behaviorScenarios.set(id, scenario);
  }

  const behaviorScenarioValues = new Set(behaviorScenarios.values());
  const uiScenarios = new Map<string, DynamicRecord>();
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

async function collectScenarioPaths(
  gameRoot: string,
  relativeRoot: string,
): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const root = path.join(gameRoot, relativeRoot);
  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name, "en"),
    )) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`${absolute} must not be a symbolic link.`);
      }
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".scenario.ts"))
        files.push(absolute);
    }
  }
  await visit(root);
  if (files.length === 0) {
    throw new Error(
      `${gameRoot} must provide ${relativeRoot}/**/*.scenario.ts.`,
    );
  }
  return files;
}

function resolveWorkspacePath(
  gameRoot: string,
  entry: unknown,
  label: string,
): string {
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

async function importModule(filePath: string): Promise<DynamicRecord> {
  return import(
    `${pathToFileURL(filePath).href}?workspace=${Date.now()}`
  ) as Promise<DynamicRecord>;
}

async function loadScenario(
  filePath: string,
  label: string,
): Promise<DynamicRecord & { id: string }> {
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
