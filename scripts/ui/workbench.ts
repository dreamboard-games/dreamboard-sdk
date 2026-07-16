#!/usr/bin/env node
import { spawn } from "node:child_process";
import { watch, type FSWatcher } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  defaultGeneratedWorkbenchRoot,
  materializeWorkbench,
  readScenarioIds,
} from "./materialize.ts";
import { hasErrorCode, root } from "./support.ts";

type WorkbenchCommand = "build" | "dev" | "test";

const commandArguments: Record<WorkbenchCommand, readonly string[]> = {
  build: ["exec", "vite", "build"],
  dev: ["exec", "vite", "--host", "127.0.0.1", "--port", "5173"],
  test: ["exec", "playwright", "test"],
};

async function generatedRootIsUsable(generatedRoot: string): Promise<boolean> {
  return stat(path.join(generatedRoot, "catalog.ts"))
    .then((entry) => entry.isFile())
    .catch((error: unknown) => {
      if (hasErrorCode(error, "ENOENT")) return false;
      throw error;
    });
}

export async function runWorkbenchCommand(
  command: WorkbenchCommand,
  args: readonly string[] = [],
  generatedRoot = process.env.DREAMBOARD_WORKBENCH_GENERATED_ROOT,
): Promise<void> {
  const resolvedRoot =
    generatedRoot &&
    path.isAbsolute(generatedRoot) &&
    (await generatedRootIsUsable(generatedRoot))
      ? generatedRoot
      : (
          await materializeWorkbench({
            outputRoot: defaultGeneratedWorkbenchRoot,
          })
        ).generatedRoot;
  await spawnInherited(
    "pnpm",
    [...commandArguments[command], ...args],
    path.join(root, "packages/ui-workbench"),
    {
      DREAMBOARD_WORKBENCH_GENERATED_ROOT: resolvedRoot,
    },
  );
}

export interface OpenWorkbenchOptions {
  readonly scenario?: string;
  readonly source?: boolean;
}

export async function openWorkbench(
  options: OpenWorkbenchOptions = {},
): Promise<void> {
  const gameIds = options.scenario
    ? [options.scenario.split(".", 1)[0] ?? options.scenario]
    : [];
  const materialization = await materializeWorkbench({ gameIds });
  if (options.scenario) {
    const scenarioIds = await readScenarioIds(
      path.join(materialization.generatedRoot, "fixtures/reference-games"),
    );
    if (!scenarioIds.includes(options.scenario)) {
      throw new Error(
        `Unknown UI scenario '${options.scenario}'. Available scenarios: ${scenarioIds.join(", ")}.`,
      );
    }
  }
  const route = options.scenario ? `/scenario/${options.scenario}` : "/";
  console.log(`http://127.0.0.1:5173${route}`);

  const watchers = installWatchers({
    gameIds,
    outputRoot: materialization.generatedRoot,
    source: options.source ?? false,
  });
  try {
    await spawnInherited(
      "pnpm",
      commandArguments.dev,
      path.join(root, "packages/ui-workbench"),
      {
        DREAMBOARD_WORKBENCH_GENERATED_ROOT: materialization.generatedRoot,
        ...(options.source ? { DREAMBOARD_WORKBENCH_SDK: "source" } : {}),
      },
    );
  } finally {
    for (const watcher of watchers) watcher.close();
  }
}

function installWatchers(options: {
  readonly gameIds: readonly string[];
  readonly outputRoot: string;
  readonly source: boolean;
}): readonly FSWatcher[] {
  const referenceRoots =
    options.gameIds.length > 0
      ? options.gameIds.map((id) =>
          id === "ui-scenarios"
            ? path.join(root, "examples/ui-scenarios")
            : path.join(root, "examples/reference-games", id),
        )
      : [
          path.join(root, "examples/reference-games"),
          path.join(root, "examples/ui-scenarios"),
        ];
  const watchedRoots = options.source
    ? [...referenceRoots, path.join(root, "packages/sdk/src")]
    : referenceRoots;
  let timer: NodeJS.Timeout | undefined;
  let rebuilding = false;
  let queued = false;
  async function rebuild(changed: string): Promise<void> {
    if (rebuilding) {
      queued = true;
      return;
    }
    rebuilding = true;
    try {
      console.log(`[ui] rematerializing after ${changed}`);
      await materializeWorkbench({
        outputRoot: options.outputRoot,
        gameIds: options.gameIds,
      });
      console.log("[ui] Workbench materialization updated");
    } catch (error) {
      console.error(
        `[ui] rematerialization failed; retaining the last good output: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      rebuilding = false;
      if (queued) {
        queued = false;
        void rebuild("queued source changes");
      }
    }
  }
  return watchedRoots.map((sourceRoot) =>
    watch(sourceRoot, { recursive: true }, (_event, filename) => {
      const changed = filename?.toString() ?? sourceRoot;
      if (/(^|\/)(build|dist|node_modules)(\/|$)/.test(changed)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void rebuild(changed), 175);
    }),
  );
}

export async function spawnInherited(
  command: string,
  args: readonly string[],
  cwd = root,
  env: NodeJS.ProcessEnv = {},
): Promise<void> {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  const forwardInterrupt = () => child.kill("SIGINT");
  const forwardTermination = () => child.kill("SIGTERM");
  process.once("SIGINT", forwardInterrupt);
  process.once("SIGTERM", forwardTermination);
  try {
    const code = await new Promise<number>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (exitCode, signal) => {
        if (signal) {
          reject(new Error(`${command} exited after ${signal}.`));
        } else {
          resolve(exitCode ?? 1);
        }
      });
    });
    if (code !== 0) {
      throw new Error(`${command} ${args.join(" ")} exited with code ${code}.`);
    }
  } finally {
    process.off("SIGINT", forwardInterrupt);
    process.off("SIGTERM", forwardTermination);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [command, ...args] = process.argv.slice(2);
  if (command !== "build" && command !== "dev" && command !== "test") {
    console.error(
      "Usage: node scripts/ui/workbench.ts <build|dev|test> [...args]",
    );
    process.exitCode = 2;
  } else {
    runWorkbenchCommand(command, args).catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
  }
}
