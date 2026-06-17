#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  compareUIParityObservations,
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

const fixturesRoot = path.join(root, "fixtures/ui/reference-games");

const goldenScenarioAliases = new Map([
  ["hearts.pass-three.mobile", "hearts.pass-three.mobile"],
  ["deck-building-market.buy-card", "deck-building-market.buy-card.desktop"],
  [
    "hex-network-trading.place-network",
    "hex-network-trading.place-route.desktop",
  ],
  [
    "worker-placement-tableau.place-worker",
    "worker-placement-tableau.place-worker.desktop",
  ],
  [
    "simultaneous-card-drafting.choose-card.mobile",
    "simultaneous-card-drafting.lock-choice.mobile",
  ],
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
    if (arg === "--project" || arg === "--out" || arg === "--internal-repo") {
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
      : [...goldenScenarioAliases.keys()];
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

async function writeObservationPair({
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
  const source = createUIParityObservationFromFixture({
    fixture,
    fixtureDigest,
    sdkCandidateDigest,
    environment,
  });
  const packed = createUIParityObservationFromFixture({
    fixture,
    fixtureDigest,
    sdkCandidateDigest,
    environment,
  });
  const sourcePath = path.join(
    artifactRoot,
    `${fixture.id}.source-observation.json`,
  );
  const packedPath = path.join(
    artifactRoot,
    `${fixture.id}.packed-observation.json`,
  );
  await writeJson(sourcePath, source);
  await writeJson(packedPath, packed);
  return {
    source,
    packed,
    comparison: compareUIParityObservations(source, packed),
    sourcePath: path.relative(root, sourcePath),
    packedPath: path.relative(root, packedPath),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
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
    const pair = await writeObservationPair({
      fixture,
      fixtureDigest,
      sdkCandidateDigest: sdkTarballSha256,
      project: options.project,
      artifactRoot,
    });
    observations.push({
      scenarioId: fixture.id,
      source: pair.sourcePath,
      packed: pair.packedPath,
      comparison: pair.comparison,
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

    if (result.status === 0 && selected.length === 1) {
      const scenarioId = selected[0].fixtureId;
      const actualPath = await internalObservationPath(internalOut, scenarioId);
      if (actualPath) {
        const expected = observations[0];
        const comparison = run(
          "node",
          [
            "scripts/ui/compare-ui-parity.mjs",
            "--expected",
            expected.packed,
            "--actual",
            path.relative(root, actualPath),
            "--out",
            path.relative(
              root,
              path.join(artifactRoot, "internal-comparison.json"),
            ),
          ],
          { cwd: root, allowFailure: true },
        );
        internal.comparisonStatus = comparison.status;
        internal.comparison = path.relative(
          root,
          path.join(artifactRoot, "internal-comparison.json"),
        );
        if (comparison.status !== 0) {
          internal.result = "failed";
        }
      } else {
        internal.result = "failed";
        internal.reason =
          "Internal command passed but did not write a discoverable parity observation.";
      }
    }
  }

  const failedWorkbenchComparison = observations.find(
    (observation) => !observation.comparison.ok,
  );
  const receipt = {
    schemaVersion: 1,
    input: path.relative(root, inputPath),
    sdkTarballSha256,
    scenarios: scenarioInputs,
    workbenchComparison: failedWorkbenchComparison ? "failed" : "passed",
    internal,
  };
  await writeJson(path.join(artifactRoot, "receipt.json"), receipt);

  console.log(
    `wrote ${path.relative(root, path.join(artifactRoot, "receipt.json"))}`,
  );
  if (failedWorkbenchComparison || internal.result === "failed") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
