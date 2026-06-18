#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  readComponentScenarioIndex,
  scenarioById,
  scenariosForCapability,
  scenariosForContract,
  selectScenariosForSourceFiles,
} from "./component-scenario-index-lib.mjs";
import { repoCommandEnv, root } from "./reference-games-lib.mjs";
import { requiredWorkbenchScenarioIds } from "./required-ui-scenarios.mjs";

const fixturesRoot = path.join(root, "fixtures/ui/reference-games");

function parseArgs(argv) {
  const options = { changed: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--changed") {
      options.changed = true;
      continue;
    }
    if (arg === "--required") {
      options.required = true;
      continue;
    }
    if (arg === "--explain") {
      options.explain = true;
      continue;
    }
    if (
      arg === "--scenario" ||
      arg === "--component" ||
      arg === "--capability" ||
      arg === "--base" ||
      arg === "--project" ||
      arg === "--out"
    ) {
      options[arg.slice(2)] = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }
  return options;
}

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env:
      command === "git"
        ? repoCommandEnv({ ...process.env, ...options.env })
        : { ...process.env, ...options.env },
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });
  return result;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
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

async function changedFiles(baseRef) {
  const result = run("git", ["diff", "--name-only", `${baseRef}...HEAD`]);
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "git diff failed");
  }
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function selectScenarios({ options, fixtures, index, changed }) {
  if (options.required) {
    const ids = new Set(fixtures.map((entry) => entry.id));
    const missing = requiredWorkbenchScenarioIds.filter((id) => !ids.has(id));
    if (missing.length > 0) {
      throw new Error(
        `Required Workbench scenarios are missing from the fixture bundle: ${missing.join(", ")}`,
      );
    }
    return {
      reason: "required",
      scenarioIds: [...requiredWorkbenchScenarioIds],
      changedExports: [],
      fullSuite: false,
    };
  }

  if (options.scenario) {
    const ids = Object.keys(index.scenarios ?? {});
    if (!ids.includes(options.scenario)) {
      throw new Error(
        `Unknown scenario '${options.scenario}'. Close matches: ${closeMatches(
          options.scenario,
          ids,
        ).join(", ")}`,
      );
    }
    return {
      reason: "scenario",
      scenarioIds: [options.scenario],
      changedExports: [],
      fullSuite: false,
    };
  }

  if (options.component) {
    const components = Object.keys(index.contracts ?? {}).sort();
    if (!components.includes(options.component)) {
      throw new Error(
        `Unknown component '${options.component}'. Close matches: ${closeMatches(
          options.component,
          components,
        ).join(", ")}`,
      );
    }
    return {
      reason: "component",
      scenarioIds: scenariosForContract(index, options.component),
      changedExports: [options.component],
      fullSuite: false,
    };
  }

  if (options.capability) {
    const capabilities = [
      ...new Set(
        Object.values(index.scenarios ?? {}).flatMap(
          (entry) => entry.capabilities ?? [],
        ),
      ),
    ].sort();
    if (!capabilities.includes(options.capability)) {
      throw new Error(
        `Unknown capability '${options.capability}'. Close matches: ${closeMatches(
          options.capability,
          capabilities,
        ).join(", ")}`,
      );
    }
    return {
      reason: "capability",
      scenarioIds: scenariosForCapability(index, options.capability),
      changedExports: [],
      fullSuite: false,
    };
  }

  if (options.changed) {
    const selected = selectScenariosForSourceFiles(index, changed);
    return {
      reason:
        selected.scenarioIds.length > 0
          ? "changed-source-ownership"
          : "no-ui-change",
      scenarioIds: selected.scenarioIds,
      changedExports: selected.contractIds,
      fullSuite: false,
      reasons: selected.reasons,
    };
  }

  return {
    reason: "full-suite",
    scenarioIds: fixtures.map((entry) => entry.id),
    changedExports: [],
    fullSuite: true,
  };
}

function projectsForScenario(fixture, requestedProject) {
  const knownProjects = new Set([
    "chromium-desktop",
    "chromium-touch-phone",
    "webkit-phone",
  ]);
  if (requestedProject) {
    if (!knownProjects.has(requestedProject)) {
      throw new Error(
        `Unknown Playwright project '${requestedProject}'. Expected one of: ${[
          ...knownProjects,
        ].join(", ")}`,
      );
    }
    return [requestedProject];
  }
  const capabilities = new Set(fixture.source?.capabilities ?? []);
  const viewportTags = new Set(fixture.environment?.viewportTags ?? []);
  const projects = ["chromium-desktop"];
  if (
    capabilities.has("touch-drag") ||
    viewportTags.has("phone") ||
    viewportTags.has("touch")
  ) {
    projects.push("chromium-touch-phone");
    projects.push("webkit-phone");
  }
  return projects;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const bundle = await readJson(path.join(fixturesRoot, "index.json"));
  const index = await readComponentScenarioIndex();
  const files = options.changed
    ? await changedFiles(options.base ?? "origin/main")
    : [];
  const selection = selectScenarios({
    options,
    fixtures: bundle.fixtures,
    index,
    changed: files,
  });
  if (options.explain) {
    console.log(JSON.stringify({ changedFiles: files, ...selection }, null, 2));
    return;
  }
  if (selection.scenarioIds.length === 0) {
    console.log("No UI Workbench scenarios selected.");
    return;
  }
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactRoot = path.resolve(
    root,
    options.out ?? path.join("artifacts/ui", runId),
  );
  await mkdir(path.join(artifactRoot, "semantic"), { recursive: true });
  await mkdir(path.join(artifactRoot, "screenshots"), { recursive: true });
  await mkdir(path.join(artifactRoot, "traces"), { recursive: true });
  await mkdir(path.join(artifactRoot, "transcripts"), { recursive: true });
  await writeFile(
    path.join(artifactRoot, "selection.json"),
    `${JSON.stringify({ schemaVersion: 1, changedFiles: files, ...selection }, null, 2)}\n`,
  );

  const sdkCommit = run("git", [
    "rev-parse",
    "--short=12",
    "HEAD",
  ]).stdout.trim();
  const results = [];
  for (const scenarioId of selection.scenarioIds) {
    if (!scenarioById(index, scenarioId)) {
      throw new Error(`Unknown selected scenario '${scenarioId}'.`);
    }
    const fixture = await readJson(
      path.join(fixturesRoot, `${scenarioId}.fixture.json`),
    );
    for (const project of projectsForScenario(fixture, options.project)) {
      const transcriptFile = path.join(
        artifactRoot,
        "transcripts",
        `${scenarioId}.${project}.txt`,
      );
      const evidenceFile = path.join(
        artifactRoot,
        "semantic",
        `${scenarioId}.${project}.json`,
      );
      const test = run(
        "pnpm",
        [
          "--filter",
          "@dreamboard-games/ui-workbench",
          "test",
          `--project=${project}`,
          "tests/scenario.spec.ts",
        ],
        {
          env: {
            UI_SCENARIO_ID: scenarioId,
            UI_SCENARIO_EVIDENCE_PATH: evidenceFile,
            UI_SCENARIO_SCREENSHOT_DIR: path.join(artifactRoot, "screenshots"),
          },
        },
      );
      await writeFile(
        transcriptFile,
        `${test.stdout ?? ""}${test.stderr ?? ""}`,
      );
      const evidence =
        test.status === 0 ? await readJson(evidenceFile) : undefined;
      if (test.status === 0 && !evidence) {
        throw new Error(
          `${scenarioId} ${project} passed without writing measured evidence.`,
        );
      }
      if (
        evidence &&
        (evidence.scenarioId !== scenarioId || evidence.project !== project)
      ) {
        throw new Error(
          `${scenarioId} ${project} wrote evidence for ${evidence.scenarioId} ${evidence.project}.`,
        );
      }
      if (
        evidence &&
        (evidence.projectionDigest !== fixture.expected.finalProjectionDigest ||
          evidence.semanticDigest !== fixture.expected.finalSemanticDigest ||
          evidence.submissionDigest !== fixture.expected.submissionDigest)
      ) {
        throw new Error(
          `${scenarioId} ${project} measured evidence did not match fixture expectations.`,
        );
      }
      results.push({
        scenarioId,
        project,
        result: test.status === 0 ? "passed" : "failed",
        projectionDigest: evidence?.projectionDigest,
        semanticDigest: evidence?.semanticDigest,
        submissionDigest: evidence?.submissionDigest,
        screenshotFiles: (evidence?.screenshots ?? []).map((file) =>
          path.relative(root, file),
        ),
        evidenceFile: path.relative(root, evidenceFile),
        transcriptFile: path.relative(root, transcriptFile),
      });
      if (test.status !== 0) {
        break;
      }
    }
    if (results.some((result) => result.result === "failed")) {
      break;
    }
  }

  const receipt = {
    schemaVersion: 1,
    sdkCommit,
    candidate: {
      kind: "source",
      digest: digest(`${sdkCommit}:${JSON.stringify(selection)}`),
    },
    changedExports: selection.changedExports,
    selectedScenarios: selection.scenarioIds,
    projects: [...new Set(results.map((result) => result.project))].sort(),
    results,
  };
  await writeFile(
    path.join(artifactRoot, "receipt.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );

  const failed = results.find((result) => result.result === "failed");
  console.log(`wrote ${path.relative(root, artifactRoot)}/receipt.json`);
  if (failed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
