#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  buildRoot,
  readJson,
  repoCommandEnv,
  root,
  sha256File,
  writeJson,
} from "./reference-games-lib.mjs";
import { requiredParityScenarioIds } from "./required-ui-scenarios.mjs";

const requiredGoldenScenario = requiredParityScenarioIds[0];
if (!requiredGoldenScenario) {
  throw new Error(
    "requiredParityScenarioIds must contain at least one scenario.",
  );
}

function sameStringArray(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (
      arg === "--out" ||
      arg === "--device-canary-receipt" ||
      arg === "--real-host-parity-receipt"
    ) {
      options[arg.slice(2)] = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--require-device-canary") {
      options.requireDeviceCanary = true;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }
  return options;
}

function run(command, args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env:
      command === "git"
        ? repoCommandEnv({ ...process.env, ...options.env })
        : { ...process.env, ...options.env },
    encoding: "utf8",
    stdio: "pipe",
  });
  return {
    command: `${command} ${args.join(" ")}`,
    durationMs: Date.now() - startedAt,
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

async function latestReceipt(dir) {
  const absolute = path.join(root, dir);
  const entries = await readdir(absolute, { withFileTypes: true }).catch(
    (error) => {
      if (error?.code === "ENOENT") return [];
      throw error;
    },
  );
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const receiptPath = path.join(absolute, entry.name, "receipt.json");
    const receiptStat = await stat(receiptPath).catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (receiptStat) {
      candidates.push({ receiptPath, mtimeMs: receiptStat.mtimeMs });
    }
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return candidates[0]?.receiptPath;
}

async function requireLatestReceipt(dir) {
  const receiptPath = await latestReceipt(dir);
  if (!receiptPath) {
    throw new Error(`No receipt was written under '${dir}'.`);
  }
  return receiptPath;
}

async function findBuiltSdkTarball() {
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

async function readReceipt(receiptPath, label) {
  if (!receiptPath) {
    throw new Error(`${label} receipt path is required.`);
  }
  const absolute = path.resolve(root, receiptPath);
  return {
    path: absolute,
    receipt: JSON.parse(await readFile(absolute, "utf8")),
  };
}

function assertDigest(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label} digest ${actual ?? "<missing>"} != ${expected}.`);
  }
}

async function validateEvidenceFiles(entries, label) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`${label} must contain evidence files.`);
  }
  const paths = [];
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry.path !== "string" ||
      entry.path.length === 0 ||
      typeof entry.sha256 !== "string"
    ) {
      throw new Error(`${label} evidence entries require path and sha256.`);
    }
    const absolute = path.resolve(root, entry.path);
    assertDigest(
      `${label} evidence '${entry.path}'`,
      `sha256:${await sha256File(absolute)}`,
      entry.sha256,
    );
    paths.push(absolute);
  }
  return paths;
}

async function readDeviceCanaryReceipt(options, expected) {
  const receiptPath =
    options["device-canary-receipt"] ?? process.env.UI_DEVICE_CANARY_RECEIPT;
  if (!receiptPath && !options.requireDeviceCanary) {
    return null;
  }
  const result = await readReceipt(receiptPath, "Real-device canary");
  const receipt = result.receipt;
  if (
    receipt.schemaVersion !== 1 ||
    receipt.kind !== "dreamboard-sdk-ui-device-canary" ||
    receipt.result !== "passed"
  ) {
    throw new Error(
      `${path.relative(root, result.path)} is not a passing device-canary/v1 receipt.`,
    );
  }
  assertDigest(
    "Device canary SDK tarball",
    receipt.sdkTarballSha256,
    expected.sdkTarballSha256,
  );
  assertDigest(
    "Device canary fixture bundle",
    receipt.fixtureBundleSha256,
    expected.fixtureBundleSha256,
  );
  if (!Array.isArray(receipt.devices)) {
    throw new Error("Device canary receipt must contain devices.");
  }
  const evidencePaths = [];
  for (const requirement of [
    { platform: "ios", browser: "safari" },
    { platform: "android", browser: "chrome" },
  ]) {
    const device = receipt.devices.find(
      (candidate) =>
        candidate.platform === requirement.platform &&
        candidate.browser === requirement.browser,
    );
    if (
      !device ||
      device.result !== "passed" ||
      typeof device.osVersion !== "string" ||
      device.osVersion.length === 0 ||
      typeof device.browserVersion !== "string" ||
      device.browserVersion.length === 0 ||
      !Array.isArray(device.scenarios) ||
      device.scenarios.length === 0 ||
      device.scenarios.some(
        (scenario) => typeof scenario !== "string" || scenario.length === 0,
      ) ||
      !requiredParityScenarioIds.every((scenarioId) =>
        device.scenarios.includes(scenarioId),
      )
    ) {
      throw new Error(
        `Device canary receipt is missing passing ${requirement.platform}/${requirement.browser} evidence with versions and required parity scenarios.`,
      );
    }
    evidencePaths.push(
      ...(await validateEvidenceFiles(
        device.evidence,
        `${requirement.platform}/${requirement.browser}`,
      )),
    );
  }
  return { ...result, evidencePaths };
}

async function readRealHostParityReceipt(options, expected, runRequired) {
  let receiptPath =
    options["real-host-parity-receipt"] ??
    process.env.UI_REAL_HOST_PARITY_RECEIPT;
  if (!receiptPath && process.env.DREAMBOARD_INTERNAL_REPO) {
    await runRequired("node", [
      "scripts/ui/run-ui-parity.mjs",
      "--skip-build",
      "--require-internal",
    ]);
    receiptPath = await requireLatestReceipt("artifacts/ui-parity");
  }
  const result = await readReceipt(receiptPath, "Real-host parity");
  const receipt = result.receipt;
  if (
    receipt.schemaVersion !== 1 ||
    receipt.kind !== "dreamboard-ui-real-host-parity" ||
    receipt.mode !== "real-host-parity" ||
    receipt.result !== "passed" ||
    receipt.realHostExecutor !== true ||
    receipt.internal?.result !== "passed"
  ) {
    throw new Error(
      `${path.relative(root, result.path)} is not a passing real-host parity receipt.`,
    );
  }
  assertDigest(
    "Real-host parity SDK tarball",
    receipt.sdkTarballSha256,
    expected.sdkTarballSha256,
  );
  assertDigest(
    "Real-host parity fixture bundle",
    receipt.fixtureBundleSha256,
    expected.fixtureBundleSha256,
  );
  const scenarioIds = Array.isArray(receipt.scenarios)
    ? receipt.scenarios.map((scenario) => scenario?.id)
    : [];
  if (
    !sameStringArray(scenarioIds, requiredParityScenarioIds) ||
    receipt.source?.result !== "passed" ||
    receipt.source.comparisons?.length !== requiredParityScenarioIds.length ||
    receipt.internal.comparisons?.length !== receipt.scenarios.length ||
    receipt.internal.comparisons.some(
      (comparison) =>
        comparison.expectationStatus !== "passed" ||
        comparison.sourceStatus !== "passed",
    )
  ) {
    throw new Error(
      `Real-host parity receipt must contain independently measured, passing source and internal comparisons for required scenarios: ${requiredParityScenarioIds.join(", ")}.`,
    );
  }
  if (typeof receipt.input !== "string") {
    throw new Error("Real-host parity receipt is missing its input contract.");
  }
  const parityInputPath = path.resolve(root, receipt.input);
  const parityInput = JSON.parse(await readFile(parityInputPath, "utf8"));
  assertDigest(
    "Real-host parity input SDK tarball",
    parityInput.sdk?.sha256,
    expected.sdkTarballSha256,
  );
  assertDigest(
    "Real-host parity input fixture bundle",
    parityInput.fixtureBundle?.sha256,
    expected.fixtureBundleSha256,
  );
  const evidencePaths = [];
  for (const scenario of receipt.scenarios) {
    const comparison = receipt.internal.comparisons.find(
      (candidate) => candidate.scenarioId === scenario.id,
    );
    const source = receipt.source.comparisons.find(
      (candidate) => candidate.scenarioId === scenario.id,
    );
    if (
      !comparison ||
      typeof comparison.actual !== "string" ||
      typeof comparison.expectationComparison !== "string" ||
      typeof comparison.sourceComparison !== "string" ||
      !source ||
      typeof source.actual !== "string" ||
      typeof source.comparison !== "string"
    ) {
      throw new Error(
        `Real-host parity receipt is missing evidence paths for '${scenario.id}'.`,
      );
    }
    const expectation = parityInput.observations?.find(
      (candidate) => candidate.scenarioId === scenario.id,
    )?.expectation;
    if (typeof expectation !== "string") {
      throw new Error(
        `Real-host parity input is missing the fixture expectation for '${scenario.id}'.`,
      );
    }
    await runRequired("node", [
      "scripts/ui/compare-ui-parity.mjs",
      "--expected",
      expectation,
      "--actual",
      comparison.actual,
    ]);
    const actualPath = path.resolve(root, comparison.actual);
    const sourcePath = path.resolve(root, source.actual);
    const expectationPath = path.resolve(root, expectation);
    if (
      actualPath === sourcePath ||
      actualPath === expectationPath ||
      sourcePath === expectationPath
    ) {
      throw new Error(
        `Parity evidence for '${scenario.id}' must come from three distinct observation files.`,
      );
    }
    const [expectationObservation, sourceObservation, actualObservation] =
      await Promise.all(
        [expectationPath, sourcePath, actualPath].map(async (filePath) =>
          JSON.parse(await readFile(filePath, "utf8")),
        ),
      );
    if (
      expectationObservation.provenance?.kind !== "fixture-expectation" ||
      sourceObservation.provenance?.kind !== "source-workbench" ||
      actualObservation.provenance?.kind !== "packed-real-host"
    ) {
      throw new Error(
        `Parity evidence for '${scenario.id}' must identify fixture, source Workbench, and packed real-host provenance.`,
      );
    }
    const observationDigests = new Set(
      await Promise.all(
        [expectationPath, sourcePath, actualPath].map(
          async (filePath) => `sha256:${await sha256File(filePath)}`,
        ),
      ),
    );
    if (observationDigests.size !== 3) {
      throw new Error(
        `Parity evidence for '${scenario.id}' must contain three independently materialized observations.`,
      );
    }
    const provenanceEvidence = [
      sourceObservation.provenance.evidence,
      actualObservation.provenance.evidence,
    ];
    if (
      provenanceEvidence.some(
        (filePath) => typeof filePath !== "string" || filePath.length === 0,
      )
    ) {
      throw new Error(
        `Measured parity observations for '${scenario.id}' must reference their execution evidence.`,
      );
    }
    const provenanceEvidencePaths = provenanceEvidence.map((filePath) =>
      path.resolve(root, filePath),
    );
    await Promise.all(
      provenanceEvidencePaths.map((filePath) => stat(filePath)),
    );
    await runRequired("node", [
      "scripts/ui/compare-ui-parity.mjs",
      "--expected",
      source.actual,
      "--actual",
      comparison.actual,
    ]);
    const comparisonPaths = [
      source.comparison,
      comparison.expectationComparison,
      comparison.sourceComparison,
    ].map((filePath) => path.resolve(root, filePath));
    for (const comparisonPath of comparisonPaths) {
      const comparisonResult = JSON.parse(
        await readFile(comparisonPath, "utf8"),
      );
      if (comparisonResult.ok !== true) {
        throw new Error(
          `Real-host parity comparison for '${scenario.id}' is not passing.`,
        );
      }
    }
    await stat(actualPath);
    evidencePaths.push(
      expectationPath,
      sourcePath,
      actualPath,
      ...provenanceEvidencePaths,
      ...comparisonPaths,
    );
  }
  evidencePaths.push(parityInputPath);
  return { ...result, evidencePaths };
}

function assertStepPassed(step) {
  if (step.status !== 0) {
    throw new Error(`${step.command} failed\n${step.output}`);
  }
}

async function writeTranscript(artifactRoot, steps) {
  await writeFile(
    path.join(artifactRoot, "transcript.txt"),
    steps.map((step) => `$ ${step.command}\n${step.output}`).join("\n"),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactRoot = path.resolve(
    root,
    options.out ?? path.join("artifacts/ui-release-proof", runId),
  );
  await mkdir(artifactRoot, { recursive: true });

  const steps = [];
  async function runRequired(command, args) {
    const step = run(command, args);
    steps.push(step);
    if (step.status !== 0) {
      await writeTranscript(artifactRoot, steps);
      assertStepPassed(step);
    }
    return step;
  }

  await runRequired("pnpm", ["ui:hard-cut:check"]);
  await runRequired("pnpm", ["ui:coverage:check"]);
  await runRequired("pnpm", ["ui:catalog:check"]);
  await runRequired("pnpm", ["ui:fixtures:check"]);
  await runRequired("pnpm", ["ui:test:stories"]);
  await runRequired("pnpm", ["ui:test:visual"]);
  await runRequired("pnpm", ["ui:test", "--required"]);
  await runRequired("pnpm", ["reference-games:bundle"]);

  const sdkTarball = await findBuiltSdkTarball();
  await runRequired("node", [
    "scripts/ui/verify-reference-consumers.mjs",
    "--sdk-tarball",
    path.relative(root, sdkTarball),
    "--required",
  ]);

  const fixtureIndexPath = path.join(
    root,
    "build/ui-workbench/generated/fixtures/reference-games/index.json",
  );
  const sdkTarballSha256 = `sha256:${await sha256File(sdkTarball)}`;
  const fixtureBundleSha256 = `sha256:${await sha256File(fixtureIndexPath)}`;
  const expectedDigests = { sdkTarballSha256, fixtureBundleSha256 };
  const realHostParity = await readRealHostParityReceipt(
    options,
    expectedDigests,
    runRequired,
  );
  const deviceCanary = await readDeviceCanaryReceipt(options, expectedDigests);
  await writeTranscript(artifactRoot, steps);

  const sdkPackageJson = await readJson(
    path.join(root, "packages/sdk/package.json"),
  );
  const sdkCommit = run("git", ["rev-parse", "--short=12", "HEAD"]);
  assertStepPassed(sdkCommit);
  const referenceLock = await readJson(
    path.join(buildRoot, "reference-bundle.lock.json"),
  );
  assertDigest(
    "Reference bundle SDK tarball",
    sdkTarballSha256,
    referenceLock.sdkTarballSha256,
  );

  const verifiedTarballDir = path.join(artifactRoot, "sdk");
  const verifiedTarball = path.join(
    verifiedTarballDir,
    path.basename(sdkTarball),
  );
  await mkdir(verifiedTarballDir, { recursive: true });
  await copyFile(sdkTarball, verifiedTarball);

  const evidencePaths = [
    await requireLatestReceipt("artifacts/ui-stories"),
    await requireLatestReceipt("artifacts/ui-visual"),
    await requireLatestReceipt("artifacts/ui"),
    path.join(buildRoot, "packed-consumer-receipt.json"),
    realHostParity.path,
    ...realHostParity.evidencePaths,
    ...(deviceCanary ? [deviceCanary.path, ...deviceCanary.evidencePaths] : []),
  ];
  const evidence = await Promise.all(
    evidencePaths.map(async (filePath) => ({
      path: path.relative(root, filePath),
      sha256: `sha256:${await sha256File(filePath)}`,
    })),
  );

  const receipt = {
    schemaVersion: 1,
    kind: "dreamboard-sdk-ui-release-proof",
    checkedAt: new Date().toISOString(),
    sdkVersion: sdkPackageJson.version,
    sdkCommit: sdkCommit.output.trim(),
    tarball: path.relative(root, verifiedTarball),
    tarballSha256: sdkTarballSha256,
    fixtureBundleSha256,
    referenceBundleSha256: referenceLock.referenceBundle.sha256,
    browserInteractionProtocol: "3.0.0",
    gates: {
      componentCoverage: "passed",
      storybookInteractions: "passed",
      storybookVisuals: "passed",
      workbenchMatrix: "passed",
      packedReferenceConsumers: "passed",
      realHostParity: "passed",
      realDeviceCanary: deviceCanary ? "passed" : "not-required",
    },
    parityScenarios: realHostParity.receipt.scenarios.map(
      (scenario) => scenario.id,
    ),
    deviceCanary: deviceCanary
      ? deviceCanary.receipt.devices.map((device) => ({
          platform: device.platform,
          browser: device.browser,
          osVersion: device.osVersion,
          browserVersion: device.browserVersion,
          scenarios: device.scenarios,
        }))
      : [],
    evidence,
    transcript: path.relative(root, path.join(artifactRoot, "transcript.txt")),
    steps: steps.map(({ command, durationMs, status }) => ({
      command,
      durationMs,
      status,
    })),
  };

  await writeJson(path.join(artifactRoot, "receipt.json"), receipt);
  console.log(`wrote ${path.relative(root, artifactRoot)}/receipt.json`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
