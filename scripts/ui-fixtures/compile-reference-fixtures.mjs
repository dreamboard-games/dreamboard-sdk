#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "prettier";
import {
  expectedReferenceGames,
  referenceGamesRoot,
  repoCommandEnv,
  root,
  sha256File,
  writeJson,
} from "../ui/reference-games-lib.mjs";
import {
  FixturePluginRuntime,
  compilePluginProtocolTape,
  compileUIScenarioFixture,
  createFixtureHostHarness,
  createReducerScenarioRunner,
  digestUIFixtureJson,
  digestUIFixtureRequest,
  digestUIScenarioFixture,
  serializeUIScenarioFixture,
} from "../../packages/sdk/dist/testing.js";
import {
  readBrowserInteractionSnapshot,
  resolveBrowserInteractionEffect,
  resolveBrowserInteractionIntent,
  resolveBrowserPointerTarget,
} from "../../packages/sdk/dist/browser-interaction.js";
import { createPluginRuntimeClient } from "../../packages/sdk/dist/runtime.js";
import { DREAMBOARD_PLUGIN_PROTOCOL_VERSION } from "../../packages/plugin-runtime-contract/dist/index.js";

const sdkRequire = createRequire(
  new URL("../../packages/sdk/package.json", import.meta.url),
);
const React = sdkRequire("react");
const { act } = React;
const { createRoot } = sdkRequire("react-dom/client");
const { GlobalRegistrator } = sdkRequire("@happy-dom/global-registrator");

const fixturesRoot = path.join(root, "fixtures/ui/reference-games");
const browserInteractionProtocolVersion = "3.0.0";
const gameplayScopeId = "runtime";

GlobalRegistrator.register();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env:
      command === "git"
        ? repoCommandEnv(options.env)
        : (options.env ?? process.env),
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

const renderedComponentSelectors = {
  CardDragSurface: "[data-dreamboard-card-drag-surface]",
  CardDropTargetView: "[data-dreamboard-card-drop-target]",
  CardFace: "[data-dreamboard-card-face]",
  CostDisplay: '[role="list"][aria-label^="Cost:"]',
  HandView: "[data-dreamboard-hand-view]",
  InteractionInput: "[data-dreamboard-interaction-input]",
  InteractionSubmit: "[data-dreamboard-interaction-submit]",
  Panel: "[data-dreamboard-panel]",
  PluginRuntime: '[data-dreamboard-browser-scope="runtime"]',
  ResourceCounter: "[data-dreamboard-resource-counter]",
  SlotSystem: ".slot-system",
};

function collectRenderedComponents(container) {
  return Object.entries(renderedComponentSelectors)
    .filter(([, selector]) => container.querySelector(selector))
    .map(([component]) => component)
    .sort();
}

function collectVisibleInteractionKeys(snapshot) {
  return [
    ...new Set(
      snapshot.surfaces.flatMap((surface) =>
        "interactions" in surface
          ? surface.interactions.map(
              (interaction) => interaction.interactionKey,
            )
          : [],
      ),
    ),
  ].sort();
}

function capabilitiesForReplay(replay, viewportTags) {
  const capabilities = new Set(["runtime-submit"]);
  for (const step of replay) {
    if (step.execute.kind === "activate") capabilities.add("click");
    if (step.execute.kind === "fill") capabilities.add("runtime-draft");
    if (step.execute.kind === "drag") {
      capabilities.add(
        viewportTags.includes("touch") ? "touch-drag" : "pointer-drag",
      );
    }
  }
  return [...capabilities].sort();
}

function scenarioReplay(coverage) {
  return coverage.replay ?? { kind: "invoke" };
}

function scenarioInputs(coverage) {
  const replay = scenarioReplay(coverage);
  if (replay.kind === "drag") {
    return [
      {
        key: replay.cardInputKey,
        kind: "cardTarget",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          zoneId: "hand",
          eligibleTargets: [replay.cardId],
          selection: { mode: "single" },
        },
      },
      {
        key: replay.destinationInputKey,
        kind: "boardTarget",
        domain: {
          type: "boardTarget",
          projection: "resolved",
          targetKind: replay.destinationKind,
          eligibleTargets: replay.eligibleDestinationIds,
          selection: { mode: "single" },
        },
      },
    ];
  }
  if (replay.kind === "draft") {
    return [
      {
        key: replay.inputKey,
        kind: "boundedNumber",
        domain: {
          type: "boundedNumber",
          min: replay.min,
          max: replay.max,
          step: 1,
        },
      },
    ];
  }
  return [];
}

function scenarioSubmissionParams(coverage) {
  const replay = scenarioReplay(coverage);
  if (replay.kind === "drag") {
    return {
      [replay.cardInputKey]: replay.cardId,
      [replay.destinationInputKey]: replay.destinationId,
    };
  }
  if (replay.kind === "draft") {
    return { [replay.inputKey]: replay.value };
  }
  return {};
}

function buildInteractionDescriptors(referenceGame, coverage) {
  const selectedInteraction = scenarioInteraction(referenceGame, coverage);
  return Object.fromEntries(
    referenceGame.interactions.map((interaction) => {
      const inputs =
        interaction.id === selectedInteraction.id
          ? scenarioInputs(coverage)
          : [];
      const descriptor = {
        phaseName: "fixture",
        interactionKey: interaction.id,
        interactionId: `${interaction.id}:player-1`,
        kind: "action",
        availability: { status: "available" },
        commit: { mode: "manual" },
        ...(inputs.some((input) => input.domain.zoneId === "hand")
          ? { zoneId: "hand" }
          : {}),
        inputs,
      };
      return [
        interaction.id,
        {
          ...descriptor,
          descriptorDigest: digestUIFixtureJson({
            gameId: referenceGame.id,
            interaction,
            descriptor,
          }),
        },
      ];
    }),
  );
}

function scenarioInteraction(referenceGame, coverage) {
  const interaction = referenceGame.interactions.find((candidate) =>
    coverage.scenarioId.includes(candidate.id),
  );
  if (!interaction) {
    throw new Error(
      `${coverage.scenarioId} does not identify a reference-game interaction.`,
    );
  }
  return interaction;
}

function scenarioZones({ coverage, interaction }) {
  const replay = scenarioReplay(coverage);
  if (replay.kind !== "drag") return {};
  const card = {
    id: replay.cardId,
    cardType: "route",
    name: "Route",
    properties: { subtitle: "Network link" },
  };
  return {
    hand: {
      cardIds: [replay.cardId],
      cardViewsById: {
        [replay.cardId]: JSON.stringify(card),
      },
      playableByCardId: {
        [replay.cardId]: [interaction.id],
      },
    },
  };
}

async function createReferenceProtocol({ referenceGame, coverage }) {
  const interactionsByRef = buildInteractionDescriptors(
    referenceGame,
    coverage,
  );
  const interaction = scenarioInteraction(referenceGame, coverage);
  const validationInput = {
    kind: "interaction",
    playerId: "player-1",
    interactionId: `${interaction.id}:player-1`,
    params: {},
  };
  const submissionInput = {
    ...validationInput,
    params: scenarioSubmissionParams(coverage),
  };
  const initialState = {
    domain: {
      flow: {
        currentPhase: coverage.scenarioId,
        activePlayers: ["player-1"],
      },
      publicState: {
        referenceGameId: referenceGame.id,
        displayName: referenceGame.displayName,
        scenarioId: coverage.scenarioId,
        submittedInteractionId: null,
      },
    },
    runtime: {},
  };
  const bundle = {
    projectSeatsDynamic({ state, playerIds }) {
      return {
        currentStage: state.domain.flow.currentPhase,
        stageSeats: [...playerIds],
        simultaneousPhase: null,
        seats: Object.fromEntries(
          playerIds.map((playerId) => [
            playerId,
            {
              view: state.domain.publicState,
              availableInteractionRefs: referenceGame.interactions.map(
                (candidate) => candidate.id,
              ),
              zones: scenarioZones({
                coverage,
                interaction,
              }),
            },
          ]),
        ),
        interactionsByRef,
      };
    },
    projectStatic() {
      return null;
    },
    async validateInput({ input: candidate }) {
      return candidate.kind === "interaction" &&
        Object.values(interactionsByRef).some(
          (descriptor) => descriptor.interactionId === candidate.interactionId,
        )
        ? { valid: true }
        : {
            valid: false,
            errorCode: "UNKNOWN_INTERACTION",
            message: "Unknown reference-game interaction.",
          };
    },
    async dispatch({ state, input: candidate }) {
      const validation = await this.validateInput({
        state,
        input: candidate,
      });
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
            flow: {
              currentPhase: `${coverage.scenarioId}.submitted`,
              activePlayers: ["player-1"],
            },
            publicState: {
              ...state.domain.publicState,
              submittedInteractionId: candidate.interactionId,
            },
          },
        },
        trace: [],
      };
    },
  };
  const runner = createReducerScenarioRunner({
    scenarioId: coverage.scenarioId,
    gameId: referenceGame.id,
    initialState,
    bundle,
    viewer: { seatId: "player-1", playerId: "player-1" },
    playerIds: ["player-1"],
  });
  const trace = await runner.run([
    {
      id: `${coverage.scenarioId}.validate`,
      operation: "validate",
      input: validationInput,
    },
    {
      id: `${coverage.scenarioId}.submit`,
      operation: "submit",
      input: submissionInput,
    },
  ]);
  return compilePluginProtocolTape({
    trace,
    session: {
      sessionId: `${coverage.scenarioId}.fixture-session`,
      players: [{ playerId: "player-1", displayName: "Player 1" }],
    },
  });
}

async function buildRenderModule({ gameDir, uiContractFingerprint }) {
  const sharedSource = await readFile(
    path.join(referenceGamesRoot, "shared/reference-ui.mjs"),
    "utf8",
  );
  const source = await readFile(path.join(gameDir, "src/ui.mjs"), "utf8");
  return `${sharedSource}
${source.replace(
  /import \{ createReferenceGameRoot \} from "\.\.\/\.\.\/shared\/reference-ui\.mjs";\n/,
  "",
)}
export const uiContractFingerprint = ${JSON.stringify(uiContractFingerprint)};
`;
}

async function settleFixtureRuntime(harness) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await harness.flush();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function exerciseRenderedScenario({
  fixtureId,
  modulePath,
  protocol,
  sourceRequest,
  targetRequest,
  interactionId,
  submissionParams,
}) {
  const executionRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-ui-render-module-"),
  );
  const executableModulePath = path.join(
    executionRoot,
    path.basename(modulePath),
  );
  await cp(modulePath, executableModulePath);
  await mkdir(path.join(executionRoot, "node_modules/@dreamboard-games"), {
    recursive: true,
  });
  await symlink(
    path.join(root, "packages/sdk"),
    path.join(executionRoot, "node_modules/@dreamboard-games/sdk"),
    "dir",
  );
  await symlink(
    path.join(root, "packages/plugin-runtime-contract"),
    path.join(
      executionRoot,
      "node_modules/@dreamboard-games/plugin-runtime-contract",
    ),
    "dir",
  );
  await symlink(
    path.dirname(sdkRequire.resolve("react/package.json")),
    path.join(executionRoot, "node_modules/react"),
    "dir",
  );
  const module = await import(
    `${pathToFileURL(executableModulePath).href}?fixture=${encodeURIComponent(fixtureId)}`
  );
  const harness = createFixtureHostHarness({ tape: protocol });
  const runtime = createPluginRuntimeClient({ transport: harness.transport });
  const container = document.createElement("div");
  document.body.append(container);
  const renderRoot = createRoot(container);

  try {
    await act(async () => {
      renderRoot.render(
        React.createElement(
          FixturePluginRuntime,
          { harness, runtime },
          React.createElement(module.Root),
        ),
      );
      await settleFixtureRuntime(harness);
    });

    const initialSnapshot = readBrowserInteractionSnapshot(container);
    const renderedComponents = collectRenderedComponents(container);
    const resolution =
      "effect" in sourceRequest
        ? resolveBrowserInteractionEffect(initialSnapshot, sourceRequest)
        : resolveBrowserInteractionIntent(initialSnapshot, sourceRequest);
    if (!resolution.ok) {
      throw new Error(
        `${fixtureId} semantic replay request did not resolve uniquely: ${resolution.code}`,
      );
    }
    if (targetRequest) {
      const targetResolution = resolveBrowserPointerTarget(
        initialSnapshot,
        targetRequest,
      );
      if (!targetResolution.ok) {
        throw new Error(
          `${fixtureId} semantic drag target did not resolve uniquely: ${targetResolution.code}`,
        );
      }
    }

    const validation = await runtime.validateInteraction(interactionId, {});
    if (!validation.valid) {
      throw new Error(
        `${fixtureId} runtime validation failed: ${validation.errorCode ?? "invalid"}`,
      );
    }

    await act(async () => {
      await runtime.submitInteraction(interactionId, submissionParams);
      await settleFixtureRuntime(harness);
    });
    harness.assertConsumed();
    const finalSnapshot = readBrowserInteractionSnapshot(container);

    return {
      resolution,
      finalFrameId: harness.getCurrentFrameId(),
      finalSemanticDigest: digestUIFixtureJson({
        digestVersion: "runtime-browser-interaction@2",
        snapshot: finalSnapshot,
      }),
      visibleInteractionKeys: collectVisibleInteractionKeys(finalSnapshot),
      renderedComponents,
    };
  } finally {
    await act(async () => {
      renderRoot.unmount();
    });
    runtime.disconnect();
    container.remove();
    await rm(executionRoot, { recursive: true, force: true });
  }
}

function replayRequests(coverage, interactionId) {
  const base = {
    surface: "gameplay",
    scopeId: gameplayScopeId,
    interactionKey: interactionId,
    interactionId: `${interactionId}:player-1`,
  };
  const replay = scenarioReplay(coverage);
  if (replay.kind === "drag") {
    return {
      sourceRequest: {
        ...base,
        effect: {
          kind: "setCandidate",
          inputKey: replay.cardInputKey,
          candidateValue: replay.cardId,
          beforeSelected: false,
          afterSelected: true,
        },
      },
      targetRequest: {
        ...base,
        effect: {
          kind: "setCandidate",
          inputKey: replay.destinationInputKey,
          candidateValue: replay.destinationId,
          beforeSelected: false,
          afterSelected: true,
        },
      },
    };
  }
  if (replay.kind === "draft") {
    return {
      sourceRequest: {
        ...base,
        effect: {
          kind: "setScalar",
          inputKey: replay.inputKey,
          value: replay.value,
        },
      },
    };
  }
  return {
    sourceRequest: {
      ...base,
      intent: "invoke",
    },
  };
}

function expectedIdentity(stepId, interactionId, resolution) {
  return {
    stepId,
    surface: "gameplay",
    scopeId: gameplayScopeId,
    interactionKey: resolution.interactionKey,
    interactionId: `${interactionId}:player-1`,
    actuatorId: resolution.actuator.actuatorId,
    descriptorDigest: resolution.actuator.descriptorDigest,
    draftDigest: resolution.actuator.draftDigest,
  };
}

function buildReplay({
  coverage,
  interaction,
  exercise,
  finalFrame,
  submissionDigest,
  sourceRequest,
  targetRequest,
}) {
  const replay = scenarioReplay(coverage);
  const fixtureId = coverage.scenarioId;
  const firstStepId =
    replay.kind === "invoke"
      ? `${fixtureId}.invoke`
      : `${fixtureId}.${replay.kind}`;
  const firstStep = {
    stepId: firstStepId,
    requestDigest: digestUIFixtureRequest(sourceRequest),
    resolve: sourceRequest,
    execute:
      replay.kind === "drag"
        ? { kind: "drag", target: targetRequest }
        : replay.kind === "draft"
          ? { kind: "fill", value: String(replay.value) }
          : { kind: "activate" },
    expectedIdentity: expectedIdentity(
      firstStepId,
      interaction.id,
      exercise.resolution,
    ),
    expect:
      replay.kind === "invoke"
        ? {
            frameId: finalFrame.id,
            projectionDigest: finalFrame.projectionDigest,
            semanticDigest: exercise.finalSemanticDigest,
            submissionDigest,
            visibleInteractionKeys: exercise.visibleInteractionKeys,
          }
        : {
            visibleInteractionKeys: [interaction.id],
          },
  };
  if (replay.kind === "invoke") return [firstStep];

  const commitStepId = `${fixtureId}.commit`;
  const commitRequest = {
    surface: "gameplay",
    scopeId: gameplayScopeId,
    interactionKey: interaction.id,
    interactionId: `${interaction.id}:player-1`,
    intent: "submit",
  };
  return [
    firstStep,
    {
      stepId: commitStepId,
      requestDigest: digestUIFixtureRequest(commitRequest),
      resolve: commitRequest,
      execute: { kind: "activate" },
      expect: {
        frameId: finalFrame.id,
        projectionDigest: finalFrame.projectionDigest,
        semanticDigest: exercise.finalSemanticDigest,
        submissionDigest,
        visibleInteractionKeys: exercise.visibleInteractionKeys,
      },
    },
  ];
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
  const moduleSource = await format(
    await buildRenderModule({
      gameDir,
      uiContractFingerprint,
    }),
    { parser: "babel" },
  );
  const modulePath = path.join(outputRoot, renderModule);
  await mkdir(path.dirname(modulePath), { recursive: true });
  await writeFile(modulePath, moduleSource);
  const renderModuleDigest = sha256Text(moduleSource);

  const protocol = await createReferenceProtocol({ referenceGame, coverage });
  const interaction = scenarioInteraction(referenceGame, coverage);
  const { sourceRequest, targetRequest } = replayRequests(
    coverage,
    interaction.id,
  );
  const submissionParams = scenarioSubmissionParams(coverage);
  const exercise = await exerciseRenderedScenario({
    fixtureId,
    modulePath,
    protocol,
    sourceRequest,
    targetRequest,
    interactionId: `${interaction.id}:player-1`,
    submissionParams,
  });
  const finalFrame = protocol.frames.find(
    (frame) => frame.id === exercise.finalFrameId,
  );
  if (!finalFrame) {
    throw new Error(
      `${fixtureId} did not produce runtime frame '${exercise.finalFrameId}'.`,
    );
  }
  const submissionDigest = digestUIFixtureJson({
    fixtureId,
    interactionId: `${interaction.id}:player-1`,
  });

  const viewportTags = fixtureId.endsWith(".mobile")
    ? ["phone", "touch"]
    : ["desktop"];
  const replay = buildReplay({
    coverage,
    interaction,
    exercise,
    finalFrame,
    submissionDigest,
    sourceRequest,
    targetRequest,
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
      viewportTags,
    },
    protocol,
    replay,
    expected: {
      finalSemanticDigest: exercise.finalSemanticDigest,
      submissionDigest,
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
    components: exercise.renderedComponents,
    capabilities: capabilitiesForReplay(replay, viewportTags),
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
    schemaVersion: 2,
    bundleId: `reference-games@${sdkCommit}`,
    sdkCommit,
    pluginRuntimeProtocol: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
    browserInteractionProtocol: browserInteractionProtocolVersion,
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
