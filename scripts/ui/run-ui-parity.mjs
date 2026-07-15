#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { copyFile, readdir, readFile, mkdir } from "node:fs/promises";
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
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--scenario") {
      options.scenarios.push(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--project" || arg === "--out" || arg === "--sdk-tarball") {
      options[arg.slice(2)] = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--skip-build") {
      options.build = false;
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
    path: observationPath,
  };
}

async function stageArtifact(source, destination, inputRoot) {
  const target = path.join(inputRoot, destination);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  return {
    path: destination.split(path.sep).join("/"),
    sha256: `sha256:${await sha256File(target)}`,
  };
}

async function stagePortableSourceEvidence({
  evidence,
  evidencePath,
  inputRoot,
  scenarioId,
}) {
  const portable = structuredClone(evidence);
  const screenshotMap = new Map();
  for (const screenshot of evidence.screenshots ?? []) {
    if (typeof screenshot !== "string" || !path.isAbsolute(screenshot)) {
      throw new Error(
        `Source evidence for '${scenarioId}' must bind absolute producer screenshot paths before portable staging.`,
      );
    }
    const destination = path.join(
      "evidence",
      "screenshots",
      scenarioId,
      path.basename(screenshot),
    );
    const reference = await stageArtifact(screenshot, destination, inputRoot);
    screenshotMap.set(screenshot, reference.path);
  }
  portable.screenshots = (evidence.screenshots ?? []).map((screenshot) =>
    screenshotMap.get(screenshot),
  );
  portable.steps = (evidence.steps ?? []).map((step) => ({
    ...step,
    ...(typeof step.screenshotPath === "string"
      ? { screenshotPath: screenshotMap.get(step.screenshotPath) }
      : {}),
  }));
  await writeJson(evidencePath, portable);
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
      basis: frame.frame.basis,
      projectionDigest: measured.projectionDigest,
      semanticDigest: measured.semanticDigest,
      submissionDigest:
        replayStep.expect.submissionDigest ??
        (isFinal ? fixture.expected.submissionDigest : undefined),
    };
  });
  return {
    schemaVersion: 2,
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
    run(
      "node",
      [
        "scripts/ui/build-reference-bundle.mjs",
        ...(options["sdk-tarball"]
          ? ["--sdk-tarball", options["sdk-tarball"]]
          : []),
      ],
      {
        cwd: root,
        stdio: "inherit",
      },
    );
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
  const sdkTarball = options["sdk-tarball"]
    ? path.resolve(root, options["sdk-tarball"])
    : await findSdkTarball();
  const sdkTarballSha256 = `sha256:${await sha256File(sdkTarball)}`;
  if (sdkTarballSha256 !== referenceLock.sdkTarballSha256) {
    throw new Error(
      `SDK tarball digest ${sdkTarballSha256} does not match reference bundle lock ${referenceLock.sdkTarballSha256}.`,
    );
  }
  const fixtureIndexPath = path.join(fixturesRoot, "index.json");
  const inputRoot = path.join(artifactRoot, "portable-input");
  await mkdir(inputRoot, { recursive: true });

  const scenarioInputs = [];
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
    const portableEvidencePath = path.join(
      inputRoot,
      "evidence",
      `${fixture.id}.source-evidence.json`,
    );
    await mkdir(path.dirname(portableEvidencePath), { recursive: true });
    await stagePortableSourceEvidence({
      evidence: sourceEvidence,
      evidencePath: portableEvidencePath,
      inputRoot,
      scenarioId: fixture.id,
    });
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
        evidencePath: path.relative(inputRoot, portableEvidencePath),
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
        path.relative(root, expectation.path),
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
    scenarioInputs.push({
      requestedId: selection.requestedId,
      id: fixture.id,
      sourceScenarioId: fixture.source.scenarioId,
      file: path.relative(root, path.join(fixturesRoot, entry.file)),
      fixturePath: path.join(fixturesRoot, entry.file),
      renderModulePath: path.join(fixturesRoot, entry.renderModule),
      expectationPath: expectation.path,
      sourcePath: sourceObservationPath,
      fixtureDigest,
      aliased: selection.aliased,
    });
  }

  const portableSdk = await stageArtifact(
    sdkTarball,
    path.join("artifacts", "sdk.tgz"),
    inputRoot,
  );
  const portableReferenceBundle = await stageArtifact(
    path.resolve(root, referenceLock.referenceBundle.path),
    path.join("artifacts", "reference-games.tar.gz"),
    inputRoot,
  );
  const portableFixtureIndex = await stageArtifact(
    fixtureIndexPath,
    path.join("fixtures", "index.json"),
    inputRoot,
  );
  const portableScenarios = [];
  for (const scenario of scenarioInputs) {
    portableScenarios.push({
      id: scenario.id,
      fixture: await stageArtifact(
        scenario.fixturePath,
        path.join("fixtures", scenario.id, "fixture.json"),
        inputRoot,
      ),
      renderModule: await stageArtifact(
        scenario.renderModulePath,
        path.join("fixtures", scenario.id, "render-module.mjs"),
        inputRoot,
      ),
      expectation: await stageArtifact(
        scenario.expectationPath,
        path.join("observations", `${scenario.id}.expectation.json`),
        inputRoot,
      ),
      source: await stageArtifact(
        scenario.sourcePath,
        path.join("observations", `${scenario.id}.source.json`),
        inputRoot,
      ),
    });
  }
  const input = {
    schemaVersion: 2,
    sdk: { tarball: portableSdk },
    referenceBundle: portableReferenceBundle,
    fixtureBundle: {
      index: portableFixtureIndex,
      scenarios: portableScenarios,
    },
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
  };
  const inputPath = path.join(inputRoot, "input.json");
  await writeJson(inputPath, input);

  const internal = {
    result: "skipped",
    reason:
      "Real-host parity is owned by the consuming product and supplied as an external receipt.",
    comparisons: [],
  };

  const receipt = {
    schemaVersion: 2,
    kind: "dreamboard-ui-parity-source-preparation",
    mode: "source-workbench",
    result: "passed",
    realHostExecutor: false,
    input: {
      path: path.relative(artifactRoot, inputPath).split(path.sep).join("/"),
      sha256: `sha256:${await sha256File(inputPath)}`,
    },
    sdkTarballSha256,
    fixtureBundleSha256: portableFixtureIndex.sha256,
    scenarios: scenarioInputs.map((scenario) => ({
      id: scenario.id,
      fixtureDigest: scenario.fixtureDigest,
    })),
    source: {
      result: "passed",
      comparisons: sourceComparisons.map((comparison) => ({
        scenarioId: comparison.scenarioId,
        actual: path
          .relative(
            artifactRoot,
            path.resolve(
              inputRoot,
              portableScenarios.find(
                (scenario) => scenario.id === comparison.scenarioId,
              ).source.path,
            ),
          )
          .split(path.sep)
          .join("/"),
        comparison: path
          .relative(artifactRoot, path.resolve(root, comparison.comparison))
          .split(path.sep)
          .join("/"),
        evidence: path
          .relative(
            artifactRoot,
            path.join(
              inputRoot,
              "evidence",
              `${comparison.scenarioId}.source-evidence.json`,
            ),
          )
          .split(path.sep)
          .join("/"),
      })),
    },
    internal,
  };
  await writeJson(path.join(artifactRoot, "receipt.json"), receipt);

  console.log(
    `wrote ${path.relative(root, path.join(artifactRoot, "receipt.json"))}`,
  );
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
