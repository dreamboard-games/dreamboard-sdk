#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createUIParityObservationFromFixture,
  digestUIScenarioFixture,
  parseUIScenarioFixture,
  parseUIScenarioFixtureBundleIndex,
} from "../../packages/sdk/dist/testing.js";
import {
  buildRoot,
  readJson,
  root,
  sha256File,
  writeJson,
} from "./reference-games-lib.mjs";
import { requiredParityScenarioIds } from "./required-ui-scenarios.mjs";
import {
  defaultGeneratedWorkbenchRoot,
  materializeWorkbench,
} from "./materialize-workbench.mjs";

const fixturesRoot = path.join(
  defaultGeneratedWorkbenchRoot,
  "fixtures/reference-games",
);
if (requiredParityScenarioIds.length === 0) {
  throw new Error(
    "requiredParityScenarioIds must contain at least one scenario.",
  );
}

const goldenScenarioAliases = new Map([
  ...requiredParityScenarioIds.map((scenarioId) => [scenarioId, scenarioId]),
]);

function parseArgs(argv) {
  const options = {
    scenarios: [],
    build: true,
    requireInternal: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--scenario") {
      options.scenarios.push(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--project" || arg === "--out" || arg === "--internal-repo") {
      options[arg.slice(2)] = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--skip-build") {
      options.build = false;
      continue;
    }
    if (arg === "--require-internal") {
      options.requireInternal = true;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }
  return options;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });
  if (options.allowFailure !== true && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${options.cwd ?? root}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result;
}

function runId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function resolveScenarioIds(requestedScenarios, bundle) {
  const fixtureIds = new Set(bundle.fixtures.map((entry) => entry.id));
  const requests =
    requestedScenarios.length > 0
      ? requestedScenarios
      : requiredParityScenarioIds;
  return requests.map((requestedId) => {
    const fixtureId = fixtureIds.has(requestedId)
      ? requestedId
      : goldenScenarioAliases.get(requestedId);
    if (!fixtureId || !fixtureIds.has(fixtureId)) {
      const known = [...fixtureIds].sort().join(", ");
      const aliases = [...goldenScenarioAliases.keys()].sort().join(", ");
      throw new Error(
        `Unknown parity scenario '${requestedId}'. Fixture ids: ${known}. Phase 7 aliases: ${aliases}.`,
      );
    }
    return {
      requestedId,
      fixtureId,
      aliased: requestedId !== fixtureId,
    };
  });
}

function viewportForFixture(fixture) {
  const tags = new Set(fixture.environment.viewportTags);
  if (tags.has("phone")) {
    return { width: 390, height: 844 };
  }
  if (tags.has("tablet")) {
    return { width: 768, height: 1024 };
  }
  return { width: 1280, height: 720 };
}

function projectForFixture(fixture) {
  const tags = new Set(fixture.environment.viewportTags);
  return tags.has("phone") || tags.has("touch")
    ? "chromium-touch-phone"
    : "chromium-desktop";
}

async function findSdkTarball() {
  const sdkDir = path.join(buildRoot, "sdk");
  const entries = await readdir(sdkDir);
  const tarballs = entries.filter((entry) => entry.endsWith(".tgz")).sort();
  if (tarballs.length !== 1) {
    throw new Error(
      `Expected exactly one SDK tarball in ${path.relative(root, sdkDir)}, found ${tarballs.length}.`,
    );
  }
  return path.join(sdkDir, tarballs[0]);
}

async function maybeStat(target) {
  try {
    return await stat(target);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function internalObservationPath(internalOut, scenarioId) {
  const candidates = [
    path.join(internalOut, "observation.json"),
    path.join(internalOut, "ui-parity-observation.json"),
    path.join(internalOut, `${scenarioId}.observation.json`),
    path.join(internalOut, "observations", `${scenarioId}.json`),
  ];
  for (const candidate of candidates) {
    if (await maybeStat(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function writeFixtureExpectation({
  fixture,
  fixtureDigest,
  sdkCandidateDigest,
  project,
  artifactRoot,
}) {
  const environment = {
    project: project ?? projectForFixture(fixture),
    viewport: viewportForFixture(fixture),
  };
  const observation = createUIParityObservationFromFixture({
    fixture,
    fixtureDigest,
    sdkCandidateDigest,
    environment,
  });
  const observationPath = path.join(
    artifactRoot,
    `${fixture.id}.fixture-expectation.json`,
  );
  await writeJson(observationPath, observation);
  return {
    observation,
    path: path.relative(root, observationPath),
  };
}

export function createMeasuredObservation({
  fixture,
  fixtureDigest,
  sdkCandidateDigest,
  project,
  evidence,
  evidencePath,
}) {
  if (
    evidence?.kind !== "dreamboard-ui-scenario-evidence" ||
    evidence.scenarioId !== fixture.id ||
    evidence.project !== project ||
    !Array.isArray(evidence.steps) ||
    evidence.steps.length !== fixture.replay.length
  ) {
    throw new Error(
      `Measured source evidence for '${fixture.id}' did not match the requested scenario, project, or replay length.`,
    );
  }
  const frameById = new Map(
    fixture.protocol.frames.map((frame) => [frame.id, frame]),
  );
  const checkpoints = fixture.replay.map((replayStep, index) => {
    const measured = evidence.steps[index];
    if (!measured || measured.stepId !== replayStep.stepId) {
      throw new Error(
        `Measured source evidence for '${fixture.id}' is missing replay step '${replayStep.stepId}'.`,
      );
    }
    const frame = frameById.get(measured.frameId);
    if (!frame) {
      throw new Error(
        `Measured source replay step '${replayStep.stepId}' reported unknown frame '${measured.frameId ?? "<missing>"}'.`,
      );
    }
    const identity = replayStep.expectedIdentity;
    if (
      identity?.interactionId &&
      measured.interactionId !== identity.interactionId
    ) {
      throw new Error(
        `Measured source replay step '${replayStep.stepId}' resolved interaction '${measured.interactionId ?? "<missing>"}' instead of '${identity.interactionId}'.`,
      );
    }
    const isFinal = index === fixture.replay.length - 1;
    return {
      stepId: measured.stepId,
      interactionKey: identity?.interactionKey,
      interactionId: identity?.interactionId,
      actuatorId: identity?.actuatorId,
      descriptorDigest: identity?.descriptorDigest,
      draftDigest: measured.draftDigest,
      gameVersion: frame.frame.gameVersion,
      actionSetVersion: frame.frame.actionSetVersion,
      perspectivePlayerId: frame.frame.perspectivePlayerId,
      projectionDigest: measured.projectionDigest,
      semanticDigest: measured.semanticDigest,
      submissionDigest:
        replayStep.expect.submissionDigest ??
        (isFinal ? fixture.expected.submissionDigest : undefined),
    };
  });
  return {
    schemaVersion: 1,
    scenarioId: fixture.id,
    fixtureDigest,
    sdkCandidateDigest,
    pluginRuntimeProtocol: fixture.pluginRuntimeProtocol,
    browserInteractionProtocol: fixture.browserInteractionProtocol,
    environment: {
      project,
      viewport: viewportForFixture(fixture),
    },
    provenance: {
      kind: "source-workbench",
      evidence: evidencePath,
    },
    checkpoints,
    diagnostics: [],
  };
}

export function parityWorkbenchMaterializationOptions(options) {
  return {
    outputRoot: defaultGeneratedWorkbenchRoot,
    reuseExisting: !options.build,
  };
}

export function paritySourceScenarioArgs({ fixtureId, project, outputRoot }) {
  return [
    "scripts/ui/run-ui-scenarios.mjs",
    "--scenario",
    fixtureId,
    "--project",
    project,
    "--out",
    outputRoot,
    "--reuse-materialization",
  ];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await materializeWorkbench(parityWorkbenchMaterializationOptions(options));
  if (options.build) {
    run("node", ["scripts/ui/build-reference-bundle.mjs"], {
      cwd: root,
      stdio: "inherit",
    });
  }

  const bundle = parseUIScenarioFixtureBundleIndex(
    await readJson(path.join(fixturesRoot, "index.json")),
  );
  const selected = resolveScenarioIds(options.scenarios, bundle);
  const artifactRoot = path.resolve(
    root,
    options.out ?? path.join("artifacts/ui-parity", runId()),
  );
  await mkdir(artifactRoot, { recursive: true });

  const referenceLock = await readJson(
    path.join(buildRoot, "reference-bundle.lock.json"),
  );
  const sdkTarball = await findSdkTarball();
  const sdkTarballSha256 = `sha256:${await sha256File(sdkTarball)}`;
  if (sdkTarballSha256 !== referenceLock.sdkTarballSha256) {
    throw new Error(
      `SDK tarball digest ${sdkTarballSha256} does not match reference bundle lock ${referenceLock.sdkTarballSha256}.`,
    );
  }
  const fixtureIndexPath = path.join(fixturesRoot, "index.json");

  const scenarioInputs = [];
  const observations = [];
  const sourceComparisons = [];
  for (const selection of selected) {
    const entry = bundle.fixtures.find(
      (item) => item.id === selection.fixtureId,
    );
    if (!entry) {
      throw new Error(`Missing fixture entry '${selection.fixtureId}'.`);
    }
    const fixture = parseUIScenarioFixture(
      JSON.parse(await readFile(path.join(fixturesRoot, entry.file), "utf8")),
    );
    const fixtureDigest = digestUIScenarioFixture(fixture);
    const expectation = await writeFixtureExpectation({
      fixture,
      fixtureDigest,
      sdkCandidateDigest: sdkTarballSha256,
      project: options.project,
      artifactRoot,
    });
    const project = options.project ?? projectForFixture(fixture);
    const sourceRunRoot = path.join(artifactRoot, "source", fixture.id);
    run(
      "node",
      paritySourceScenarioArgs({
        fixtureId: fixture.id,
        project,
        outputRoot: sourceRunRoot,
      }),
      { cwd: root, stdio: "inherit" },
    );
    const sourceReceipt = await readJson(
      path.join(sourceRunRoot, "receipt.json"),
    );
    const sourceResult = sourceReceipt.results?.find(
      (result) =>
        result.scenarioId === fixture.id && result.project === project,
    );
    if (
      !sourceResult ||
      sourceResult.result !== "passed" ||
      typeof sourceResult.evidenceFile !== "string"
    ) {
      throw new Error(
        `Source Workbench did not write passing measured evidence for '${fixture.id}' on '${project}'.`,
      );
    }
    const sourceEvidence = await readJson(
      path.resolve(root, sourceResult.evidenceFile),
    );
    const sourceObservationPath = path.join(
      artifactRoot,
      `${fixture.id}.source-observation.json`,
    );
    await writeJson(
      sourceObservationPath,
      createMeasuredObservation({
        fixture,
        fixtureDigest,
        sdkCandidateDigest: sdkTarballSha256,
        project,
        evidence: sourceEvidence,
        evidencePath: sourceResult.evidenceFile,
      }),
    );
    const sourceComparisonPath = path.join(
      artifactRoot,
      `${fixture.id}.source-comparison.json`,
    );
    run(
      "node",
      [
        "scripts/ui/compare-ui-parity.mjs",
        "--expected",
        expectation.path,
        "--actual",
        path.relative(root, sourceObservationPath),
        "--out",
        path.relative(root, sourceComparisonPath),
      ],
      { cwd: root },
    );
    sourceComparisons.push({
      scenarioId: fixture.id,
      status: "passed",
      actual: path.relative(root, sourceObservationPath),
      comparison: path.relative(root, sourceComparisonPath),
      evidence: sourceResult.evidenceFile,
    });
    observations.push({
      scenarioId: fixture.id,
      expectation: expectation.path,
      source: path.relative(root, sourceObservationPath),
    });
    scenarioInputs.push({
      requestedId: selection.requestedId,
      id: fixture.id,
      sourceScenarioId: fixture.source.scenarioId,
      file: path.relative(root, path.join(fixturesRoot, entry.file)),
      fixtureDigest,
      aliased: selection.aliased,
    });
  }

  const input = {
    schemaVersion: 1,
    sdk: {
      tarball: path.relative(root, sdkTarball),
      sha256: sdkTarballSha256,
    },
    referenceBundle: {
      url: referenceLock.referenceBundle.url,
      path: referenceLock.referenceBundle.path,
      sha256: referenceLock.referenceBundle.sha256,
    },
    fixtureBundle: {
      index: path.relative(root, fixtureIndexPath),
      sha256: `sha256:${await sha256File(fixtureIndexPath)}`,
    },
    scenarios: scenarioInputs.map((scenario) => scenario.id),
    scenarioAliases: scenarioInputs.filter((scenario) => scenario.aliased),
    project:
      options.project ??
      (selected.length === 1
        ? projectForFixture(
            parseUIScenarioFixture(
              JSON.parse(
                await readFile(
                  path.join(
                    fixturesRoot,
                    `${selected[0].fixtureId}.fixture.json`,
                  ),
                  "utf8",
                ),
              ),
            ),
          )
        : "chromium-desktop"),
    observations,
  };
  const inputPath = path.join(artifactRoot, "input.json");
  await writeJson(inputPath, input);

  const internalRepo =
    options["internal-repo"] ?? process.env.DREAMBOARD_INTERNAL_REPO;
  const internal = {
    result: "skipped",
    reason: "DREAMBOARD_INTERNAL_REPO was not set.",
    comparisons: [],
  };
  if (internalRepo) {
    internal.reason = undefined;
    const internalOut = path.join(artifactRoot, "internal");
    await mkdir(internalOut, { recursive: true });
    const result = run(
      "pnpm",
      ["verify:ui-parity", "--input", inputPath, "--out", internalOut],
      {
        cwd: path.resolve(root, internalRepo),
        allowFailure: true,
      },
    );
    await writeFile(
      path.join(artifactRoot, "internal-transcript.txt"),
      `${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
    internal.result = result.status === 0 ? "passed" : "failed";
    internal.transcript = path.relative(
      root,
      path.join(artifactRoot, "internal-transcript.txt"),
    );
    internal.exitStatus = result.status;
    if (result.status !== 0) {
      internal.reason = "Internal command failed. See transcript.";
    }

    if (result.status === 0) {
      for (const selection of selected) {
        const scenarioId = selection.fixtureId;
        const actualPath = await internalObservationPath(
          internalOut,
          scenarioId,
        );
        if (!actualPath) {
          internal.result = "failed";
          internal.reason = `Internal command passed but did not write a discoverable parity observation for '${scenarioId}'.`;
          break;
        }
        const expected = observations.find(
          (observation) => observation.scenarioId === scenarioId,
        );
        if (!expected) {
          throw new Error(`Missing fixture expectation for '${scenarioId}'.`);
        }
        const comparison = run(
          "node",
          [
            "scripts/ui/compare-ui-parity.mjs",
            "--expected",
            expected.expectation,
            "--actual",
            path.relative(root, actualPath),
            "--out",
            path.relative(
              root,
              path.join(artifactRoot, `${scenarioId}.internal-comparison.json`),
            ),
          ],
          { cwd: root, allowFailure: true },
        );
        internal.comparisons.push({
          scenarioId,
          expectationStatus: comparison.status === 0 ? "passed" : "failed",
          actual: path.relative(root, actualPath),
          expectationComparison: path.relative(
            root,
            path.join(artifactRoot, `${scenarioId}.internal-comparison.json`),
          ),
        });
        if (comparison.status !== 0) {
          internal.result = "failed";
          internal.reason = `Real-host observation for '${scenarioId}' did not match the fixture expectation.`;
          break;
        }
        const source = sourceComparisons.find(
          (candidate) => candidate.scenarioId === scenarioId,
        );
        if (!source) {
          throw new Error(`Missing source observation for '${scenarioId}'.`);
        }
        const sourceComparisonPath = path.join(
          artifactRoot,
          `${scenarioId}.source-vs-internal-comparison.json`,
        );
        const sourceComparison = run(
          "node",
          [
            "scripts/ui/compare-ui-parity.mjs",
            "--expected",
            source.actual,
            "--actual",
            path.relative(root, actualPath),
            "--out",
            path.relative(root, sourceComparisonPath),
          ],
          { cwd: root, allowFailure: true },
        );
        internal.comparisons.at(-1).sourceStatus =
          sourceComparison.status === 0 ? "passed" : "failed";
        internal.comparisons.at(-1).sourceComparison = path.relative(
          root,
          sourceComparisonPath,
        );
        if (sourceComparison.status !== 0) {
          internal.result = "failed";
          internal.reason = `Real-host observation for '${scenarioId}' did not match the independently measured source Workbench observation.`;
          break;
        }
      }
    }
  }

  const receipt = {
    schemaVersion: 1,
    kind: "dreamboard-ui-real-host-parity",
    mode: "real-host-parity",
    result: internal.result,
    realHostExecutor: internal.result === "passed",
    input: path.relative(root, inputPath),
    sdkTarballSha256,
    fixtureBundleSha256: input.fixtureBundle.sha256,
    scenarios: scenarioInputs,
    source: {
      result: "passed",
      comparisons: sourceComparisons,
    },
    internal,
  };
  await writeJson(path.join(artifactRoot, "receipt.json"), receipt);

  console.log(
    `wrote ${path.relative(root, path.join(artifactRoot, "receipt.json"))}`,
  );
  if (
    internal.result === "failed" ||
    (options.requireInternal && internal.result !== "passed")
  ) {
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
