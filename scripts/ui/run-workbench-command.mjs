#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  defaultGeneratedWorkbenchRoot,
  materializeWorkbench,
} from "./materialize-workbench.mjs";
import { root } from "./reference-games-lib.mjs";

const [command, ...args] = process.argv.slice(2);
const commands = {
  build: ["exec", "vite", "build"],
  dev: ["exec", "vite", "--host", "127.0.0.1"],
  test: ["exec", "playwright", "test"],
};

if (!command || !commands[command]) {
  throw new Error(
    `Expected Workbench command ${Object.keys(commands).join(", ")}.`,
  );
}

const inheritedRoot = process.env.DREAMBOARD_WORKBENCH_GENERATED_ROOT;
const receipt =
  inheritedRoot &&
  path.isAbsolute(inheritedRoot) &&
  existsSync(path.join(inheritedRoot, "materialization-receipt.json"))
    ? { generatedRoot: inheritedRoot }
    : await materializeWorkbench({
        outputRoot: defaultGeneratedWorkbenchRoot,
      });
const child = spawn("pnpm", [...commands[command], ...args], {
  cwd: path.join(root, "packages/ui-workbench"),
  env: {
    ...process.env,
    DREAMBOARD_WORKBENCH_GENERATED_ROOT: receipt.generatedRoot,
  },
  stdio: "inherit",
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
const exitCode = await new Promise((resolve) => {
  child.on("exit", (code) => resolve(code ?? 1));
});
process.exit(exitCode);
