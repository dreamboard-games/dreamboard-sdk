import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import path from "node:path";

import {
  defaultGeneratedWorkbenchRoot,
  defaultSmokeScenarioIds,
} from "./config.ts";
import { root, spawnInherited } from "./support.ts";

export class UIUsageError extends Error {
  readonly exitCode = 2;
}

export function uiHelp(): string {
  return `Usage:
  pnpm ui storybook
  pnpm ui workbench [--scenario <id>] [--source]
  pnpm ui test [--scenario <id> | --all]
  pnpm ui snapshots update
`;
}

function parseOptions(
  args: readonly string[],
  options: ParseArgsOptionsConfig,
): Record<string, string | boolean | (string | boolean)[] | undefined> {
  try {
    const result = parseArgs({
      args: [...args],
      options,
      allowPositionals: false,
      strict: true,
    });
    return result.values;
  } catch (error) {
    throw new UIUsageError(
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function buildSdk(): Promise<void> {
  await spawnInherited("pnpm", [
    "exec",
    "turbo",
    "run",
    "build",
    "--filter=@dreamboard-games/sdk",
  ]);
}

async function runStorybookChecks(updateSnapshots = false): Promise<void> {
  await spawnInherited("pnpm", [
    "--filter",
    "@dreamboard-games/sdk",
    "storybook:build",
  ]);
  if (updateSnapshots) {
    await spawnInherited("pnpm", [
      "--filter",
      "@dreamboard-games/sdk",
      "storybook:test:visual:update",
    ]);
    return;
  }
  await spawnInherited("pnpm", [
    "--filter",
    "@dreamboard-games/sdk",
    "storybook:test",
  ]);
  await spawnInherited("pnpm", [
    "--filter",
    "@dreamboard-games/sdk",
    "storybook:test:visual",
  ]);
}

async function runWorkbenchTests(options: {
  readonly scenario?: string;
  readonly all: boolean;
  readonly includeNormalLanes: boolean;
}): Promise<void> {
  const { materializeWorkbench, readScenarioIds } =
    await import("./materialize.ts");
  const scenarioIds = selectUiScenarios(options);
  const gameIds = scenarioIds.map((id) => id.split(".", 1)[0] ?? id);
  const materialization = await materializeWorkbench({ gameIds });
  const available = await readScenarioIds(
    path.join(materialization.generatedRoot, "fixtures/reference-games"),
  );
  const unknown = scenarioIds.filter((id) => !available.includes(id));
  if (unknown.length > 0) {
    throw new UIUsageError(`Unknown UI scenario '${unknown[0]}'.`);
  }
  const testFiles = workbenchTestFiles(options.includeNormalLanes);
  await spawnInherited(
    "pnpm",
    [
      "--filter",
      "@dreamboard-games/ui-workbench",
      "exec",
      "playwright",
      "test",
      ...testFiles,
    ],
    root,
    {
      DREAMBOARD_WORKBENCH_GENERATED_ROOT: materialization.generatedRoot,
      ...(options.all ? { UI_SCENARIO_ALL: "1" } : {}),
      ...(scenarioIds.length > 0
        ? { UI_SCENARIO_IDS: JSON.stringify(scenarioIds) }
        : {}),
    },
  );
}

export function selectUiScenarios(options: {
  readonly scenario?: string;
  readonly all: boolean;
}): readonly string[] {
  return options.scenario
    ? [options.scenario]
    : options.all
      ? []
      : [...defaultSmokeScenarioIds];
}

export function workbenchTestFiles(
  includeNormalLanes: boolean,
): readonly string[] {
  return includeNormalLanes
    ? [
        "tests/driver",
        "tests/scenario-keyboard.spec.ts",
        "tests/scenario.spec.ts",
      ]
    : ["tests/scenario.spec.ts"];
}

export async function runUi(argv: readonly string[]): Promise<void> {
  const [command, ...args] = argv;
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(uiHelp());
    return;
  }
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    process.stdout.write(uiHelp());
    return;
  }
  switch (command) {
    case "storybook": {
      parseOptions(args, {});
      await spawnInherited("pnpm", [
        "--filter",
        "@dreamboard-games/sdk",
        "storybook",
      ]);
      return;
    }
    case "workbench": {
      const values = parseOptions(args, {
        scenario: { type: "string" },
        source: { type: "boolean", default: false },
      });
      await buildSdk();
      const { openWorkbench } = await import("./workbench.ts");
      await openWorkbench({
        ...(typeof values.scenario === "string"
          ? { scenario: values.scenario }
          : {}),
        source: values.source === true,
      });
      return;
    }
    case "test": {
      const values = parseOptions(args, {
        scenario: { type: "string" },
        all: { type: "boolean", default: false },
      });
      if (values.scenario && values.all) {
        throw new UIUsageError("--scenario and --all are mutually exclusive.");
      }
      await buildSdk();
      const focused = typeof values.scenario === "string";
      if (!focused) await runStorybookChecks();
      await runWorkbenchTests({
        ...(focused ? { scenario: values.scenario as string } : {}),
        all: values.all === true,
        includeNormalLanes: !focused,
      });
      return;
    }
    case "snapshots": {
      if (args.length !== 1 || args[0] !== "update") {
        throw new UIUsageError("Usage: pnpm ui snapshots update");
      }
      await runStorybookChecks(true);
      return;
    }
    default:
      throw new UIUsageError(`Unknown UI command '${command}'.\n\n${uiHelp()}`);
  }
}

export { defaultGeneratedWorkbenchRoot };
