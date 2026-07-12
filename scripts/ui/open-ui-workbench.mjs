#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { materializeWorkbench } from "./materialize-workbench.mjs";
import { root } from "./reference-games-lib.mjs";

let fixturesRoot;

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (
      arg === "--scenario" ||
      arg === "--component" ||
      arg === "--capability"
    ) {
      options[arg.slice(2)] = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }
  return options;
}

function closeMatches(value, candidates) {
  const lower = value.toLowerCase();
  return candidates
    .map((candidate) => ({
      candidate,
      score: candidate.toLowerCase().includes(lower)
        ? 0
        : Math.abs(candidate.length - value.length),
    }))
    .sort((left, right) => left.score - right.score)
    .slice(0, 5)
    .map((item) => item.candidate);
}

async function loadFixtureIndex() {
  return JSON.parse(
    await readFile(path.join(fixturesRoot, "index.json"), "utf8"),
  );
}

function routeFor(options, fixtures) {
  if (options.scenario) {
    const ids = fixtures.map((entry) => entry.id);
    if (!ids.includes(options.scenario)) {
      throw new Error(
        `Unknown scenario '${options.scenario}'. Close matches: ${closeMatches(
          options.scenario,
          ids,
        ).join(", ")}`,
      );
    }
    return `/scenario/${options.scenario}`;
  }
  if (options.component) {
    const components = [
      ...new Set(fixtures.flatMap((entry) => entry.components ?? [])),
    ].sort();
    if (!components.includes(options.component)) {
      throw new Error(
        `Unknown component '${options.component}'. Close matches: ${closeMatches(
          options.component,
          components,
        ).join(", ")}`,
      );
    }
    return `/?component=${encodeURIComponent(options.component)}`;
  }
  if (options.capability) {
    const capabilities = [
      ...new Set(fixtures.flatMap((entry) => entry.capabilities ?? [])),
    ].sort();
    if (!capabilities.includes(options.capability)) {
      throw new Error(
        `Unknown capability '${options.capability}'. Close matches: ${closeMatches(
          options.capability,
          capabilities,
        ).join(", ")}`,
      );
    }
    return `/?capability=${encodeURIComponent(options.capability)}`;
  }
  return "/";
}

async function main() {
  const receipt = await materializeWorkbench();
  fixturesRoot = path.join(receipt.generatedRoot, "fixtures/reference-games");
  const options = parseArgs(process.argv.slice(2));
  const bundle = await loadFixtureIndex();
  const route = routeFor(options, bundle.fixtures);
  const url = `http://127.0.0.1:5173${route}`;
  console.log(url);
  console.log(`UI Workbench deterministic route: ${url}`);

  const child = spawn(
    "pnpm",
    ["exec", "vite", "--host", "127.0.0.1", "--port", "5173"],
    {
      cwd: path.join(root, "packages/ui-workbench"),
      env: {
        ...process.env,
        DREAMBOARD_WORKBENCH_GENERATED_ROOT: receipt.generatedRoot,
      },
      stdio: "inherit",
    },
  );
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  const exitCode = await new Promise((resolve) => {
    child.on("exit", (code) => resolve(code ?? 0));
  });
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
