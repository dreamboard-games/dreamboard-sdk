#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { root } from "./reference-games-lib.mjs";

const fixturesRoot = path.join(root, "fixtures/ui/reference-games");

function parseArgs(argv) {
  const options = { changed: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--changed") {
      options.changed = true;
      continue;
    }
    if (
      arg === "--scenario" ||
      arg === "--component" ||
      arg === "--capability" ||
      arg === "--base"
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
    env: { ...process.env, ...options.env },
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

function selectScenarios({ options, fixtures, changed }) {
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
    return {
      reason: "scenario",
      scenarioIds: [options.scenario],
      changedExports: [],
      fullSuite: false,
    };
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
    return {
      reason: "component",
      scenarioIds: fixtures
        .filter((entry) => entry.components?.includes(options.component))
        .map((entry) => entry.id),
      changedExports: [options.component],
      fullSuite: false,
    };
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
    return {
      reason: "capability",
      scenarioIds: fixtures
        .filter((entry) => entry.capabilities?.includes(options.capability))
        .map((entry) => entry.id),
      changedExports: [],
      fullSuite: false,
    };
  }

  if (options.changed) {
    const sharedChange = changed.some(
      (file) =>
        file.includes("packages/sdk/src/ui/theme/") ||
        file.includes("packages/sdk/src/ui/plugin-styles.css") ||
        file.includes("packages/sdk/src/runtime/") ||
        file.includes("packages/sdk/src/testing/ui-fixture/"),
    );
    const changedExports = [
      ...new Set(
        fixtures.flatMap((entry) =>
          (entry.components ?? []).filter((component) =>
            changed.some((file) => file.includes(`${component}.`)),
          ),
        ),
      ),
    ].sort();
    if (sharedChange || changedExports.length === 0) {
      return {
        reason: sharedChange ? "shared-change" : "unmapped-change",
        scenarioIds: fixtures.map((entry) => entry.id),
        changedExports,
        fullSuite: true,
      };
    }
    return {
      reason: "changed-exports",
      scenarioIds: fixtures
        .filter((entry) =>
          (entry.components ?? []).some((component) =>
            changedExports.includes(component),
          ),
        )
        .map((entry) => entry.id),
      changedExports,
      fullSuite: false,
    };
  }

  return {
    reason: "full-suite",
    scenarioIds: fixtures.map((entry) => entry.id),
    changedExports: [],
    fullSuite: true,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const bundle = await readJson(path.join(fixturesRoot, "index.json"));
  const files = options.changed
    ? await changedFiles(options.base ?? "origin/main")
    : [];
  const selection = selectScenarios({
    options,
    fixtures: bundle.fixtures,
    changed: files,
  });
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactRoot = path.join(root, "artifacts/ui", runId);
  await mkdir(path.join(artifactRoot, "semantic"), { recursive: true });
  await mkdir(path.join(artifactRoot, "screenshots"), { recursive: true });
  await mkdir(path.join(artifactRoot, "traces"), { recursive: true });
  await mkdir(path.join(artifactRoot, "transcripts"), { recursive: true });
  await writeFile(
    path.join(artifactRoot, "selection.json"),
    `${JSON.stringify({ schemaVersion: 1, changedFiles: files, ...selection }, null, 2)}\n`,
  );

  const sdkCommit = run("git", ["rev-parse", "--short=12", "HEAD"]).stdout.trim();
  const results = [];
  for (const scenarioId of selection.scenarioIds) {
    const transcriptFile = path.join(
      artifactRoot,
      "transcripts",
      `${scenarioId}.txt`,
    );
    const test = run(
      "pnpm",
      ["--filter", "@dreamboard-games/ui-workbench", "test"],
      {
        env: { UI_SCENARIO_ID: scenarioId },
      },
    );
    await writeFile(transcriptFile, `${test.stdout ?? ""}${test.stderr ?? ""}`);
    const fixture = await readJson(
      path.join(fixturesRoot, `${scenarioId}.fixture.json`),
    );
    results.push({
      scenarioId,
      project: "chromium-desktop",
      result: test.status === 0 ? "passed" : "failed",
      projectionDigest: fixture.expected.finalProjectionDigest,
      semanticDigest: fixture.expected.finalSemanticDigest,
      submissionDigest: fixture.expected.submissionDigest,
      screenshotFiles: [],
      transcriptFile: path.relative(root, transcriptFile),
    });
    if (test.status !== 0) {
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
    projects: ["chromium-desktop"],
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
