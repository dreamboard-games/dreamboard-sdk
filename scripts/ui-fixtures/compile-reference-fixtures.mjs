#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import prettier from "prettier";
import {
  expectedReferenceGames,
  referenceGamesRoot,
  root,
  sha256File,
  writeJson,
} from "../ui/reference-games-lib.mjs";
import {
  compileUIScenarioFixture,
  createTestRuntime,
  digestUIFixtureJson,
  digestUIFixtureRequest,
  digestUIFixtureTransportRequest,
  digestUIScenarioFixture,
  serializeUIScenarioFixture,
} from "../../packages/sdk/dist/testing.js";
import { resolveBrowserInteractionIntent } from "../../packages/sdk/dist/browser-interaction.js";

const fixturesRoot = path.join(root, "fixtures/ui/reference-games");
const modulesRoot = path.join(fixturesRoot, "modules");
const protocolVersion = "2.0.0";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${options.cwd ?? root}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result.stdout.trim();
}

function sha256Text(text) {
  return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

function primaryCapability(uiPatterns) {
  if (uiPatterns.includes("mobile-hand-actions")) return "touch-drag";
  if (uiPatterns.includes("compact-mobile-hand")) return "touch-drag";
  if (uiPatterns.includes("hex-board-targets")) return "desktop-drag";
  if (uiPatterns.includes("resource-allocation-form")) return "runtime-draft";
  return "runtime-submit";
}

function componentsFor(patterns) {
  const components = new Set(["PluginRuntime", "InteractionForm"]);
  for (const pattern of patterns) {
    if (pattern.includes("hand")) components.add("HandView");
    if (pattern.includes("market")) components.add("MarketRow");
    if (pattern.includes("board") || pattern.includes("worker")) {
      components.add("BoardTargetLayer");
    }
    if (pattern.includes("resource")) components.add("ResourceControls");
    if (pattern.includes("dialog") || pattern.includes("confirmation")) {
      components.add("ConfirmationDialog");
    }
  }
  return [...components].sort();
}

function capabilitiesFor(patterns) {
  return [
    primaryCapability(patterns),
    "runtime-draft",
    "runtime-submit",
  ].filter((value, index, values) => values.indexOf(value) === index);
}

function buildInteractionDescriptors(referenceGame) {
  return Object.fromEntries(
    referenceGame.interactions.map((interaction) => [
      interaction.id,
      {
        phaseName: "fixture",
        interactionKey: interaction.id,
        interactionId: `${interaction.id}:player-1`,
        kind: "action",
        availability: { status: "available" },
        commit: { mode: "manual" },
        context: { to: "player-1" },
        inputs: [
          {
            key: interaction.input,
            kind: "semantic",
            domain: { target: interaction.target },
          },
        ],
      },
    ]),
  );
}

function buildProjection({
  referenceGame,
  coverage,
  frameId,
  interactionsByRef,
}) {
  return {
    currentStage: frameId,
    stageSeats: ["player-1"],
    simultaneousPhase: null,
    seats: {
      "player-1": {
        view: {
          referenceGameId: referenceGame.id,
          displayName: referenceGame.displayName,
          scenarioId: coverage.scenarioId,
          frameId,
          publicState: Object.fromEntries(
            Object.entries(referenceGame).filter(
              ([key]) =>
                ![
                  "coverage",
                  "initialPrivateHand",
                  "sdkPackageSetVersion",
                ].includes(key),
            ),
          ),
        },
        availableInteractionRefs: referenceGame.interactions.map(
          (interaction) => interaction.id,
        ),
        zones: {},
      },
    },
    interactionsByRef,
  };
}

function validateReferenceInput({ interactionsByRef, input }) {
  if (
    input.kind !== "interaction" ||
    typeof input.interactionId !== "string" ||
    !Object.values(interactionsByRef).some(
      (descriptor) => descriptor.interactionId === input.interactionId,
    )
  ) {
    return {
      valid: false,
      errorCode: "UNKNOWN_INTERACTION",
      message: "Unknown fixture interaction.",
    };
  }
  return { valid: true };
}

function createReferenceRuntime({ referenceGame, coverage }) {
  const interactionsByRef = buildInteractionDescriptors(referenceGame);
  const baseState = {
    domain: {
      flow: {
        currentPhase: coverage.scenarioId,
        activePlayers: ["player-1"],
      },
      frameId: "initial",
    },
    runtime: {},
  };

  return createTestRuntime({
    baseId: coverage.scenarioId,
    baseStates: {
      [coverage.scenarioId]: {
        snapshot: baseState,
        fingerprint: {
          players: 1,
          contractFingerprint: digestUIFixtureJson({
            gameId: referenceGame.id,
            interactions: referenceGame.interactions,
          }),
        },
      },
    },
    bundle: {
      projectSeatsDynamic({ state }) {
        return buildProjection({
          referenceGame,
          coverage,
          frameId: state.domain?.frameId ?? "initial",
          interactionsByRef,
        });
      },
      async validateInput({ input }) {
        return validateReferenceInput({ interactionsByRef, input });
      },
      async dispatch({ state, input }) {
        const validation =
          input.kind === "interaction"
            ? validateReferenceInput({ interactionsByRef, input })
            : { valid: false, errorCode: "UNKNOWN_INPUT" };
        if (!validation.valid) {
          return {
            kind: "reject",
            errorCode: validation.errorCode,
            message: validation.message,
          };
        }
        return {
          kind: "accept",
          state: {
            ...state,
            domain: {
              ...state.domain,
              frameId: "submitted",
            },
          },
          trace: [
            {
              kind: "acceptedClientInput",
              input,
            },
            {
              kind: "appliedEffect",
              effect: { kind: "ui-fixture.submit" },
            },
          ],
        };
      },
    },
    gameId: referenceGame.id,
    playerIds: ["player-1"],
    userId: "fixture-user",
    sessionId: `${coverage.scenarioId}.fixture-session`,
    contractFingerprint: digestUIFixtureJson({
      gameId: referenceGame.id,
      interactions: referenceGame.interactions,
    }),
  });
}

function browserInteractionSnapshotFor(referenceGame) {
  const interactions = referenceGame.interactions.map((interaction) => ({
    interactionKey: interaction.id,
    interactionId: `${interaction.id}:player-1`,
    descriptorDigest: digestUIFixtureJson({
      interactionKey: interaction.id,
      interactionId: `${interaction.id}:player-1`,
      input: interaction.input,
      target: interaction.target,
    }),
    draftDigest: digestUIFixtureJson({
      interactionKey: interaction.id,
      input: interaction.input,
      state: "initial",
    }),
    readiness: "ready",
    actuators: [
      {
        actuatorId: `${interaction.id}.invoke`,
        intent: "invoke",
        enabled: true,
        actuatorKind: "click",
        semanticEffects: [{ kind: "invoke" }],
        acceptedEffectPatterns: [],
        preparationPatterns: [],
        diagnostics: [],
      },
    ],
    diagnostics: [],
  }));
  return {
    protocol: {
      name: "dreamboard-browser-interaction",
      version: protocolVersion,
    },
    surfaces: [
      {
        surface: "gameplay",
        scopeId: referenceGame.id,
        interactions,
        diagnostics: [],
      },
    ],
    diagnostics: [],
  };
}

async function renderModuleSource({
  referenceGame,
  fixtureId,
  uiContractFingerprint,
}) {
  return prettier.format(
    `import React from "react";
import { PluginRuntime } from "@dreamboard-games/sdk/runtime";

export const uiContractFingerprint = ${JSON.stringify(uiContractFingerprint)};

export function Root() {
  return React.createElement("section", {
    "data-dreamboard-ui-fixture": ${JSON.stringify(fixtureId)},
    "data-dreamboard-reference-game": ${JSON.stringify(referenceGame.id)},
    "data-dreamboard-runtime": PluginRuntime ? "external-sdk-runtime" : "missing-runtime"
  }, ${JSON.stringify(referenceGame.displayName)});
}
`,
    { parser: "babel" },
  );
}

async function compileGame({ game, outputRoot, sdkCommit }) {
  const gameDir = path.join(referenceGamesRoot, game.id);
  const coverage = await readFile(
    path.join(gameDir, "scenarios/coverage.json"),
    "utf8",
  ).then(JSON.parse);
  const referenceGame = await loadReferenceGameSource({
    gameDir,
    coverage,
  });
  const fixtureId = coverage.scenarioId;
  const renderModule = `modules/${fixtureId}.mjs`;
  const uiContractFingerprint = digestUIFixtureJson({
    gameId: game.id,
    interactions: referenceGame.interactions,
    uiPatterns: game.uiPatterns,
  });
  const moduleSource = await renderModuleSource({
    referenceGame,
    fixtureId,
    uiContractFingerprint,
  });
  const modulePath = path.join(outputRoot, renderModule);
  await mkdir(path.dirname(modulePath), { recursive: true });
  await writeFile(modulePath, moduleSource);
  const renderModuleDigest = sha256Text(moduleSource);

  const runtime = createReferenceRuntime({ referenceGame, coverage });
  const initialSnapshot = runtime.getSnapshot();
  const interaction = referenceGame.interactions[0];
  const resolve = {
    surface: "gameplay",
    scopeId: game.id,
    interactionKey: interaction.id,
    interactionId: `${interaction.id}:player-1`,
    intent: "invoke",
  };
  const requestDigest = digestUIFixtureRequest(resolve);
  const validateDigest = digestUIFixtureTransportRequest({
    operation: "validate",
    playerId: "player-1",
    interactionId: `${interaction.id}:player-1`,
    payload: {},
  });
  const submitDigest = digestUIFixtureTransportRequest({
    operation: "submit",
    playerId: "player-1",
    interactionId: `${interaction.id}:player-1`,
    payload: {},
  });
  const validation = await runtime.validate(
    "player-1",
    `${interaction.id}:player-1`,
    {},
  );
  if (!validation.valid) {
    throw new Error(
      `${fixtureId} validation failed before fixture submit: ${validation.errorCode ?? "invalid"}`,
    );
  }
  await runtime.submit("player-1", `${interaction.id}:player-1`, {});
  const submittedSnapshot = runtime.getSnapshot();
  const browserSnapshot = browserInteractionSnapshotFor(referenceGame);
  const resolution = resolveBrowserInteractionIntent(browserSnapshot, resolve);
  if (!resolution.ok) {
    throw new Error(
      `${fixtureId} semantic replay request did not resolve uniquely: ${resolution.code}`,
    );
  }
  const initialProjectionDigest = digestUIFixtureJson({
    digestVersion: "reference-ui-projection@1",
    snapshot: initialSnapshot,
  });
  const finalProjectionDigest = digestUIFixtureJson({
    digestVersion: "reference-ui-projection@1",
    snapshot: submittedSnapshot,
  });

  const fixture = compileUIScenarioFixture({
    id: fixtureId,
    title: `${referenceGame.displayName}: ${coverage.assertions[0]}`,
    gameId: game.id,
    tags: [...game.mechanics, ...game.uiPatterns],
    source: {
      scenarioId: coverage.scenarioId,
      reducerFingerprint: digestUIFixtureJson({
        gameId: game.id,
        interactions: referenceGame.interactions,
      }),
      uiContractFingerprint,
      renderModule,
      renderModuleDigest,
      sourceDigest: digestUIFixtureJson({
        referenceGame,
        coverage,
        sdkCommit,
      }),
    },
    viewer: { seatId: "player-1", playerId: "player-1" },
    environment: {
      clockIso: "2026-01-01T00:00:00.000Z",
      randomSeed: `${fixtureId}.seed`,
      locale: "en-US",
      timezone: "UTC",
      viewportTags: fixtureId.endsWith(".mobile")
        ? ["phone", "touch"]
        : ["desktop"],
    },
    frames: [
      {
        id: "initial",
        snapshot: initialSnapshot,
        projectionDigest: initialProjectionDigest,
      },
      {
        id: "submitted",
        snapshot: submittedSnapshot,
        projectionDigest: finalProjectionDigest,
      },
    ],
    transport: [
      {
        id: `${fixtureId}.validate`,
        fromFrameId: "initial",
        operation: "validate",
        requestDigest: validateDigest,
        response: { kind: "accepted", nextFrameId: "initial" },
      },
      {
        id: `${fixtureId}.submit`,
        fromFrameId: "initial",
        operation: "submit",
        requestDigest: submitDigest,
        response: { kind: "accepted", nextFrameId: "submitted" },
      },
    ],
    replay: [
      {
        stepId: `${fixtureId}.invoke`,
        requestDigest,
        resolve,
        execute: { kind: "activate" },
        expectedIdentity: {
          stepId: `${fixtureId}.invoke`,
          surface: "gameplay",
          scopeId: game.id,
          interactionKey: resolution.interactionKey,
          interactionId: resolve.interactionId,
          actuatorId: resolution.actuator.actuatorId,
          descriptorDigest: resolution.actuator.descriptorDigest,
          draftDigest: resolution.actuator.draftDigest,
        },
        expect: {
          frameId: "submitted",
          projectionDigest: finalProjectionDigest,
          submissionDigest: digestUIFixtureJson({
            fixtureId,
            interactionId: `${interaction.id}:player-1`,
          }),
          visibleInteractionKeys: referenceGame.interactions.map(
            (item) => item.id,
          ),
        },
      },
    ],
    expected: {
      finalSemanticDigest: digestUIFixtureJson({
        digestVersion: "reference-ui-semantic@1",
        scenarioId: coverage.scenarioId,
        assertions: coverage.assertions,
      }),
      submissionDigest: digestUIFixtureJson({
        fixtureId,
        interactionId: `${interaction.id}:player-1`,
      }),
    },
  });

  const fixtureFile = `${fixtureId}.fixture.json`;
  await writeFile(
    path.join(outputRoot, fixtureFile),
    serializeUIScenarioFixture(fixture),
  );

  return {
    id: fixture.id,
    file: fixtureFile,
    sha256: digestUIScenarioFixture(fixture),
    renderModule,
    renderModuleSha256: renderModuleDigest,
    components: componentsFor(game.uiPatterns),
    capabilities: capabilitiesFor(game.uiPatterns),
  };
}

async function loadReferenceGameSource({ gameDir, coverage }) {
  const sourcePath = path.join(gameDir, "src/reference-game.mjs");
  const source = await readFile(sourcePath, "utf8");
  const body = source
    .replace(
      /import \{ DREAMBOARD_SDK_PACKAGE_SET \} from "@dreamboard-games\/sdk\/package-set";\n/,
      'const DREAMBOARD_SDK_PACKAGE_SET = { sdkVersion: "fixture-compiler" };\n',
    )
    .replace(
      /import coverage from "\.\.\/scenarios\/coverage\.json" with \{ type: "json" \};\n/,
      `const coverage = ${JSON.stringify(coverage)};\n`,
    )
    .replace("export const referenceGame =", "const referenceGame =")
    .replace(
      /\nif \(import\.meta\.url === `file:\/\/\$\{process\.argv\[1\]\}`\) \{[\s\S]*$/,
      "",
    );
  const factory = new Function("process", `${body}\nreturn referenceGame;`);
  return factory({ argv: [] });
}

async function hashOutputFiles(outputRoot) {
  const files = [];
  async function visit(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        const relative = path.relative(outputRoot, absolute);
        files.push([relative, await sha256File(absolute)]);
      }
    }
  }
  await visit(outputRoot);
  return files.sort(([left], [right]) => left.localeCompare(right));
}

async function compileAll(outputRoot) {
  await mkdir(path.join(outputRoot, "modules"), { recursive: true });
  const sdkCommit = run("git", ["rev-parse", "--short=12", "HEAD"]);
  const fixtures = [];
  for (const game of expectedReferenceGames) {
    fixtures.push(await compileGame({ game, outputRoot, sdkCommit }));
  }
  await writeJson(path.join(outputRoot, "index.json"), {
    schemaVersion: 1,
    bundleId: `reference-games@${sdkCommit}`,
    sdkCommit,
    browserInteractionProtocol: protocolVersion,
    fixtures: fixtures.sort((left, right) => left.id.localeCompare(right.id)),
  });
}

async function main() {
  const tmpRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-ui-fixtures-"),
  );
  const first = path.join(tmpRoot, "first");
  const second = path.join(tmpRoot, "second");
  try {
    await compileAll(first);
    await compileAll(second);
    const firstHashes = JSON.stringify(await hashOutputFiles(first));
    const secondHashes = JSON.stringify(await hashOutputFiles(second));
    if (firstHashes !== secondHashes) {
      throw new Error("Reference UI fixture compilation is non-deterministic.");
    }

    await rm(fixturesRoot, { recursive: true, force: true });
    await mkdir(fixturesRoot, { recursive: true });
    await cp(first, fixturesRoot, { recursive: true });
    console.log(`compiled ${expectedReferenceGames.length} UI fixtures`);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
