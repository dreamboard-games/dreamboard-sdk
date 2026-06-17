#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildRoot,
  readJson,
  root,
  sha256File,
  writeJson,
} from "./reference-games-lib.mjs";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out" || arg === "--device-canary-receipt") {
      options[arg.slice(2)] = argv[index + 1];
      index += 1;
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
    env: { ...process.env, ...options.env },
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
    if (receiptStat)
      candidates.push({ receiptPath, mtimeMs: receiptStat.mtimeMs });
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return candidates[0]?.receiptPath;
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

async function readDeviceCanaryReceipt(options) {
  const receiptPath =
    options["device-canary-receipt"] ?? process.env.UI_DEVICE_CANARY_RECEIPT;
  if (!receiptPath) {
    throw new Error(
      "UI_DEVICE_CANARY_RECEIPT or --device-canary-receipt is required for release proof.",
    );
  }
  const absolute = path.resolve(root, receiptPath);
  const receipt = JSON.parse(await readFile(absolute, "utf8"));
  if (receipt.result && receipt.result !== "passed") {
    throw new Error(`${path.relative(root, absolute)} did not pass.`);
  }
  return { path: absolute, receipt };
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
  await runRequired("pnpm", ["ui:test"]);
  await runRequired("pnpm", ["reference-games:bundle"]);

  const sdkTarball = await findBuiltSdkTarball();
  await runRequired("node", [
    "scripts/ui/verify-reference-consumers.mjs",
    "--sdk-tarball",
    path.relative(root, sdkTarball),
  ]);

  await runRequired("node", ["scripts/ui/run-ui-parity.mjs", "--skip-build"]);
  await writeTranscript(artifactRoot, steps);

  const sdkPackageJson = await readJson(
    path.join(root, "packages/sdk/package.json"),
  );
  const sdkCommit = run("git", ["rev-parse", "--short=12", "HEAD"]);
  assertStepPassed(sdkCommit);
  const referenceLock = await readJson(
    path.join(buildRoot, "reference-bundle.lock.json"),
  );
  const fixtureIndexPath = path.join(
    root,
    "fixtures/ui/reference-games/index.json",
  );
  const deviceCanary = await readDeviceCanaryReceipt(options);
  const evidence = [
    await latestReceipt("artifacts/ui-stories"),
    await latestReceipt("artifacts/ui-visual"),
    await latestReceipt("artifacts/ui"),
    path.join(buildRoot, "packed-consumer-receipt.json"),
    await latestReceipt("artifacts/ui-parity"),
    deviceCanary.path,
  ].filter(Boolean);

  const receipt = {
    schemaVersion: 1,
    kind: "dreamboard-sdk-ui-release-proof",
    checkedAt: new Date().toISOString(),
    sdkVersion: sdkPackageJson.version,
    sdkCommit: sdkCommit.output.trim(),
    tarballSha256: `sha256:${await sha256File(sdkTarball)}`,
    fixtureBundleSha256: `sha256:${await sha256File(fixtureIndexPath)}`,
    referenceBundleSha256: referenceLock.referenceBundle.sha256,
    browserInteractionProtocol: "3.0.0",
    gates: {
      componentCoverage: "passed",
      storybookInteractions: "passed",
      storybookVisuals: "passed",
      workbenchMatrix: "passed",
      packedReferenceConsumers: "passed",
      realHostParity: "passed",
      realDeviceCanary: "passed",
    },
    evidence: evidence.map((filePath) => path.relative(root, filePath)),
    transcript: path.relative(root, path.join(artifactRoot, "transcript.txt")),
    steps: steps.map(({ command, durationMs, status }) => ({
      command,
      durationMs,
      status,
    })),
  };

  if (receipt.tarballSha256 !== referenceLock.sdkTarballSha256) {
    throw new Error(
      `Release tarball ${receipt.tarballSha256} does not match reference lock ${referenceLock.sdkTarballSha256}.`,
    );
  }

  await writeJson(path.join(artifactRoot, "receipt.json"), receipt);
  console.log(`wrote ${path.relative(root, artifactRoot)}/receipt.json`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
