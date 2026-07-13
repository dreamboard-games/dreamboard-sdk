import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "prettier";
import { tsImport } from "tsx/esm/api";
import { readJson, root } from "../ui/reference-games-lib.mjs";
import { executeProtocolAuthority } from "./authority/protocol-authority.mjs";
import { executeReducerAuthority } from "./authority/reducer-authority.mjs";
import {
  compileUIScenarioFixture,
  digestUIFixtureJson,
  digestUIScenarioFixture,
  serializeUIScenarioFixture,
} from "../../packages/sdk/dist/testing.js";
import {
  readBrowserInteractionSnapshot,
  resolveBrowserInteractionEffect,
  resolveBrowserInteractionIntent,
  resolveBrowserPointerTarget,
} from "../../packages/sdk/dist/browser-interaction.js";
import { createReducerBundle } from "../../packages/sdk/dist/reducer.js";
import { compileScenarioReplay } from "../../packages/sdk/dist/testing-compiler.js";

const gameplayScopeId = "runtime";
const uiSourceModulePrefix = "virtual:dreamboard-ui-source:";

function sha256Text(text) {
  return `sha256:${createHash("sha256").update(text).digest("hex")}`;
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

function summarizeProtocolFrame(protocol) {
  const frame = protocol.frames[0]?.frame;
  return {
    frameId: protocol.frames[0]?.id ?? null,
    phase: frame?.flow?.currentPhase ?? null,
    activePlayers: frame?.flow?.activePlayers ?? [],
    availableInteractions: (frame?.availableInteractions ?? []).map(
      (interaction) => ({
        interactionKey: interaction.interactionKey,
        interactionId: interaction.interactionId,
        status: interaction.status,
        inputKeys: (interaction.inputs ?? []).map((input) => input.key),
      }),
    ),
  };
}

function summarizeRenderedInteractions(container) {
  const browserNodes = [
    ...container.querySelectorAll("[data-dreamboard-browser-role]"),
  ];
  const authoredNodes = [
    ...container.querySelectorAll(
      "[data-interaction-key],[data-interaction-id]",
    ),
  ];
  return {
    browserNodeCount: browserNodes.length,
    browserNodes: browserNodes.slice(0, 12).map((element) => ({
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("data-dreamboard-browser-role"),
      interactionKey: element.getAttribute("data-dreamboard-interaction-key"),
      interactionId: element.getAttribute("data-dreamboard-interaction-id"),
      intent: element.getAttribute("data-dreamboard-browser-intent"),
      actuatorId: element.getAttribute("data-dreamboard-actuator-id"),
      enabled: element.getAttribute("data-dreamboard-actuator-enabled"),
    })),
    authoredNodes: authoredNodes.slice(0, 12).map((element) => ({
      tag: element.tagName.toLowerCase(),
      interactionKey:
        element.getAttribute("data-interaction-key") ??
        element.getAttribute("data-dreamboard-interaction-key"),
      interactionId:
        element.getAttribute("data-interaction-id") ??
        element.getAttribute("data-dreamboard-interaction-id"),
      available: element.getAttribute("data-available"),
      disabled: element.getAttribute("data-disabled"),
      state: element.getAttribute("data-state"),
    })),
    htmlExcerpt: container.innerHTML.slice(0, 1600),
  };
}

function toModuleSpecifier(fromFile, toFile) {
  const relative = path
    .relative(path.dirname(fromFile), toFile)
    .split(path.sep)
    .join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

async function buildRenderModule({
  sourceModuleSpecifier,
  sourceExportName,
  uiContractFingerprint,
}) {
  return `import * as React from "react";
import * as DreamboardRuntime from "@dreamboard-games/sdk/runtime/primitives";
import * as PluginRuntimeContract from "@dreamboard-games/plugin-runtime-contract";
import * as ui from ${JSON.stringify(sourceModuleSpecifier)};

void React;
void DreamboardRuntime;
void PluginRuntimeContract;

const Root = ui[${JSON.stringify(sourceExportName)}];
if (!Root) {
  throw new Error("Reference game UI entrypoint must export Root, default, or App.");
}

function ReferenceGameRoot(props) {
  return React.createElement(
    "div",
    { "data-reference-game": "reference-game" },
    React.createElement(Root, props),
  );
}

export { ReferenceGameRoot as Root };
export const uiContractFingerprint = ${JSON.stringify(uiContractFingerprint)};
`;
}

async function resolveUiSourceExport(sourceModulePath) {
  const source = await readFile(sourceModulePath, "utf8");
  if (/\bexport\s+default\b/.test(source)) return "default";
  if (
    /\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+Root\b/.test(
      source,
    )
  ) {
    return "Root";
  }
  if (
    /\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+App\b/.test(
      source,
    )
  ) {
    return "App";
  }
  throw new Error(
    `${sourceModulePath} must export default, Root, or App for the UI fixture.`,
  );
}

async function settleFixtureRuntime(harness) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await harness.flush();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function exerciseRenderedScenario({
  gameDir,
  fixtureId,
  sourceModulePath,
  protocol,
  sourceSteps,
  targetRequest,
  interactionId,
  finalSubmit,
}) {
  const module = await importFresh(sourceModulePath, "fixture");
  const Root = module.Root ?? module.default ?? module.App;
  if (!Root) {
    throw new Error(`${sourceModulePath} must export Root, default, or App.`);
  }
  const [React, reactDomClient] = await Promise.all([
    importFromScenarioPackage(sourceModulePath, "react"),
    importFromScenarioPackage(sourceModulePath, "react-dom/client"),
  ]);
  const { act } = React;
  const { createRoot } = reactDomClient;
  const [{ createFixtureHostHarness }, runtimeModule] = await Promise.all([
    importFromScenarioPackage(
      sourceModulePath,
      "@dreamboard-games/sdk/testing",
    ),
    importFromScenarioPackage(
      sourceModulePath,
      "@dreamboard-games/sdk/runtime",
    ),
  ]);
  const harness = createFixtureHostHarness({ tape: protocol });
  const runtime = runtimeModule.createPluginRuntimeClient({
    transport: harness.transport,
  });
  const container = document.createElement("div");
  document.body.append(container);
  const renderRoot = createRoot(container);

  try {
    await act(async () => {
      renderRoot.render(
        React.createElement(
          runtimeModule.PluginRuntimeBoundary,
          { runtime },
          React.createElement(Root),
        ),
      );
    });
    await act(async () => {
      harness.reset();
      await settleFixtureRuntime(harness);
    });

    const resolutions = [];
    const resolvedRequests = [];
    const stepSemanticDigests = [];
    for (const sourceStep of sourceSteps) {
      const sourceRequest = sourceStep.request;
      const snapshot = readBrowserInteractionSnapshot(document.body);
      let actualRequest = sourceRequest;
      let resolution =
        "effect" in sourceRequest
          ? resolveBrowserInteractionEffect(snapshot, sourceRequest)
          : resolveBrowserInteractionIntent(snapshot, sourceRequest);
      if (!resolution.ok && resolution.code === "preparation-required") {
        await act(async () => {
          for (const actuator of resolution.preparation ?? []) {
            const preparationActuator = findEnabledActuator(
              document.body,
              actuator.actuatorId,
            );
            if (!preparationActuator) {
              throw new Error(
                `${fixtureId} could not find enabled preparation actuator '${actuator.actuatorId}'.`,
              );
            }
            activateElement(preparationActuator);
            await settleFixtureRuntime(harness);
          }
        });
        const preparedSnapshot = readBrowserInteractionSnapshot(document.body);
        resolution =
          "effect" in sourceRequest
            ? resolveBrowserInteractionEffect(preparedSnapshot, sourceRequest)
            : resolveBrowserInteractionIntent(preparedSnapshot, sourceRequest);
      }
      if (
        !resolution.ok &&
        !("effect" in sourceRequest) &&
        sourceRequest.intent === "submit"
      ) {
        const invokeRequest = { ...sourceRequest, intent: "invoke" };
        const invokeResolution = resolveBrowserInteractionIntent(
          snapshot,
          invokeRequest,
        );
        if (invokeResolution.ok) {
          actualRequest = invokeRequest;
          resolution = invokeResolution;
        }
      }
      if (!resolution.ok) {
        const visibleInteractionKeys = collectVisibleInteractionKeys(snapshot);
        throw new Error(
          `${fixtureId} semantic replay request did not resolve uniquely: ${resolution.code}; visibleInteractionKeys=${JSON.stringify(visibleInteractionKeys)}; request=${JSON.stringify(sourceRequest)}; protocolFrame=${JSON.stringify(summarizeProtocolFrame(protocol))}; rendered=${JSON.stringify(summarizeRenderedInteractions(container))}`,
        );
      }
      resolutions.push(resolution);
      resolvedRequests.push(actualRequest);
      if (sourceStep.preValidate) {
        const validationPromise = runtime.validateInteraction(
          interactionId,
          finalSubmit.params ?? {},
        );
        await settleFixtureRuntime(harness);
        const validation = await validationPromise;
        if (!validation.valid) {
          throw new Error(
            `${fixtureId} runtime pre-validation failed: ${validation.errorCode ?? "invalid"}`,
          );
        }
      }
      if (sourceStep.exercise === "activate") {
        const actuator = findEnabledActuator(
          document.body,
          resolution.actuator.actuatorId,
        );
        if (!actuator) {
          throw new Error(
            `${fixtureId} could not find enabled actuator '${resolution.actuator.actuatorId}'.`,
          );
        }
        await act(async () => {
          activateElement(actuator);
          await settleFixtureRuntime(harness);
        });
      }
      if (sourceStep.exercise === "activate") {
        const stepSnapshot = readBrowserInteractionSnapshot(document.body);
        stepSemanticDigests.push(
          digestUIFixtureJson({
            digestVersion: "runtime-browser-interaction@2",
            snapshot: stepSnapshot,
          }),
        );
      } else {
        stepSemanticDigests.push(undefined);
      }
    }
    if (targetRequest) {
      const targetSnapshot = readBrowserInteractionSnapshot(document.body);
      const targetResolution = resolveBrowserPointerTarget(
        targetSnapshot,
        targetRequest,
      );
      if (!targetResolution.ok) {
        throw new Error(
          `${fixtureId} semantic drag target did not resolve uniquely: ${targetResolution.code}`,
        );
      }
    }

    let submitResolution;
    if (finalSubmit && finalSubmit.kind !== "auto-submit") {
      const validationPromise = runtime.validateInteraction(
        interactionId,
        finalSubmit.params ?? {},
      );
      await settleFixtureRuntime(harness);
      const validation = await validationPromise;
      if (!validation.valid) {
        throw new Error(
          `${fixtureId} runtime validation failed: ${validation.errorCode ?? "invalid"}`,
        );
      }

      await act(async () => {
        if (finalSubmit.kind === "semantic-submit") {
          const snapshot = readBrowserInteractionSnapshot(document.body);
          const submitRequest = {
            ...sourceSteps[0].request,
            intent: "submit",
          };
          delete submitRequest.effect;
          submitResolution = resolveBrowserInteractionIntent(
            snapshot,
            submitRequest,
          );
          if (!submitResolution.ok) {
            throw new Error(
              `${fixtureId} semantic submit request did not resolve uniquely: ${submitResolution.code}; request=${JSON.stringify(submitRequest)}; rendered=${JSON.stringify(summarizeRenderedInteractions(container))}`,
            );
          }
          const actuator = [
            ...document.body.querySelectorAll("[data-dreamboard-actuator-id]"),
          ].find(
            (candidate) =>
              candidate.getAttribute("data-dreamboard-actuator-id") ===
                submitResolution.actuator.actuatorId &&
              candidate.getAttribute("data-dreamboard-browser-intent") ===
                submitResolution.actuator.intent &&
              candidate.getAttribute("data-dreamboard-actuator-enabled") ===
                "true",
          );
          if (!actuator) {
            throw new Error(
              `${fixtureId} could not find enabled submit actuator '${submitResolution.actuator.actuatorId}'.`,
            );
          }
          activateElement(actuator);
        } else {
          const submitPromise = runtime.submitInteraction(
            interactionId,
            finalSubmit.params,
          );
          await settleFixtureRuntime(harness);
          await submitPromise;
        }
        await settleFixtureRuntime(harness);
      });
    }
    harness.assertConsumed();
    const finalSnapshot = readBrowserInteractionSnapshot(document.body);

    return {
      resolution: resolutions[0],
      resolutions,
      resolvedRequests,
      submitResolution,
      finalSubmitKind: finalSubmit?.kind ?? "assert",
      stepSemanticDigests,
      finalFrameId: harness.getCurrentFrameId(),
      finalSemanticDigest: digestUIFixtureJson({
        digestVersion: "runtime-browser-interaction@2",
        snapshot: finalSnapshot,
      }),
      visibleInteractionKeys: collectVisibleInteractionKeys(finalSnapshot),
    };
  } finally {
    await act(async () => {
      renderRoot.unmount();
    });
    runtime.disconnect();
    container.remove();
  }
}

function findEnabledActuator(container, actuatorId) {
  return [...container.querySelectorAll("[data-dreamboard-actuator-id]")].find(
    (candidate) =>
      candidate.getAttribute("data-dreamboard-actuator-id") === actuatorId &&
      candidate.getAttribute("data-dreamboard-actuator-enabled") === "true",
  );
}

function activateElement(element) {
  if (typeof element.click === "function") {
    element.click();
    return;
  }
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
}

function viewportTagsForScenario(scenario, fixtureId) {
  const tags = [];
  const viewport =
    scenario.environment?.viewport ??
    (fixtureId.endsWith(".mobile") ? "phone" : "desktop");
  tags.push(viewport);
  if (scenario.environment?.input?.includes("touch") || viewport === "phone") {
    tags.push("touch");
  }
  return [...new Set(tags)];
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isReducerBundle(value) {
  return (
    isObject(value) &&
    typeof value.projectSeatsDynamic === "function" &&
    typeof value.validateInput === "function" &&
    typeof value.dispatch === "function"
  );
}

function resolveWorkspaceEntry(gameDir, entry, label) {
  if (typeof entry !== "string" || entry.length === 0) {
    throw new Error(`workspace.${label} entries must be non-empty strings.`);
  }
  if (path.isAbsolute(entry)) {
    throw new Error(`workspace.${label} entry ${entry} must be relative.`);
  }
  const absolute = path.resolve(gameDir, entry);
  const relative = path.relative(gameDir, absolute);
  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`workspace.${label} entry ${entry} escapes the game root.`);
  }
  return absolute;
}

let esbuild;

async function loadEsbuild() {
  if (!esbuild) {
    esbuild = await import("esbuild");
  }
  return esbuild;
}

async function importFresh(filePath, cacheKey = "workspace") {
  const fileUrl = pathToFileURL(filePath).href;
  const specifier = `${fileUrl}?${cacheKey}=${Date.now()}`;
  if (/\.[cm]?tsx?$/.test(filePath)) {
    return tsImport(specifier, { parentURL: fileUrl });
  }
  return import(specifier);
}

async function importFromScenarioPackage(parentPath, specifier) {
  return tsImport(specifier, {
    parentURL: pathToFileURL(parentPath).href,
  });
}

async function buildExerciseUiModule({ gameDir, sourceModulePath, fixtureId }) {
  if (!/\.[cm]?tsx?$/.test(sourceModulePath)) return sourceModulePath;
  const cacheDir = path.join(
    gameDir,
    "node_modules/.cache/dreamboard-ui-fixtures",
  );
  const safeFixtureId = fixtureId.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
  const outputPath = path.join(cacheDir, `${safeFixtureId}.exercise.mjs`);
  await mkdir(cacheDir, { recursive: true });
  const api = await loadEsbuild();
  await api.build({
    entryPoints: [sourceModulePath],
    outfile: outputPath,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    jsx: "automatic",
    absWorkingDir: gameDir,
    packages: "external",
    external: [
      "react",
      "react/jsx-runtime",
      "react-dom",
      "react-dom/client",
      "@dreamboard-games/sdk",
      "@dreamboard-games/sdk/*",
      "@dreamboard-games/plugin-runtime-contract",
      "@dreamboard-games/plugin-runtime-contract/*",
    ],
    logLevel: "silent",
  });
  return outputPath;
}

async function loadWorkspaceReducerBundle({ gameDir, metadata }) {
  const indexPath = path.join(gameDir, "app/index.ts");
  if (existsSync(indexPath)) {
    const indexModule = await importFresh(indexPath, "bundle");
    const bundle =
      indexModule.reducerBundle ?? indexModule.bundle ?? indexModule.default;
    if (isReducerBundle(bundle)) return bundle;
  }

  const reducerPath = resolveWorkspaceEntry(
    gameDir,
    metadata.workspace.reducer,
    "reducer",
  );
  const reducerModule = await importFresh(reducerPath, "reducer");
  const candidate =
    reducerModule.reducerBundle ??
    reducerModule.bundle ??
    reducerModule.default?.reducerBundle ??
    reducerModule.default;
  return isReducerBundle(candidate)
    ? candidate
    : createReducerBundle(candidate);
}

function resolveScenarioReference({ gameDir, modulePath, reference }) {
  if (typeof reference !== "string" || reference.length === 0) return null;
  if (path.isAbsolute(reference)) {
    throw new Error(`Scenario reference ${reference} must be relative.`);
  }
  const candidates = [
    path.resolve(path.dirname(modulePath), reference),
    path.resolve(gameDir, reference),
  ];
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) {
    throw new Error(`Could not resolve behavior scenario ${reference}.`);
  }
  const relative = path.relative(gameDir, resolved);
  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Behavior scenario ${reference} escapes the game root.`);
  }
  return resolved;
}

async function loadBehaviorScenario({ gameDir, scenario }) {
  if (typeof scenario.behaviorScenario !== "string") {
    throw new Error(
      `${scenario.id} must reference a reducer-native behaviorScenario by relative source path.`,
    );
  }
  const modulePath = scenario.__modulePath;
  const resolved = resolveScenarioReference({
    gameDir,
    modulePath,
    reference: scenario.behaviorScenario,
  });
  if (!resolved) {
    throw new Error(
      `${scenario.id} must reference a reducer-native behaviorScenario by relative source path.`,
    );
  }
  const module = await importFresh(resolved, "behavior");
  return {
    definition: behaviorScenarioMetadata(module.scenario ?? module.default),
    sourcePath: resolved,
  };
}

function behaviorScenarioMetadata(scenario) {
  return isObject(scenario) ? scenario : scenario;
}

function behaviorScenarioCoverageMetadata(scenario) {
  if (!isObject(scenario)) return scenario;
  const {
    setup: _setup,
    given: _given,
    when: _when,
    then: _then,
    ...metadata
  } = scenario;
  return metadata;
}

function isReducerNativeBehaviorScenario(scenario) {
  return (
    isObject(scenario) &&
    isObject(scenario.setup) &&
    Array.isArray(scenario.given) &&
    Array.isArray(scenario.when)
  );
}

export function assertReducerNativeReferenceUIScenario({
  uiScenario,
  behaviorScenario,
}) {
  const legacyStateFields = ["baseId", "initialState", "authority"].filter(
    (field) => uiScenario[field] !== undefined,
  );
  if (legacyStateFields.length > 0) {
    throw new Error(
      `${uiScenario.id} reference-game UI scenarios cannot author ${legacyStateFields.join(", ")}; use behaviorScenario plus an at checkpoint from normal reducer setup.`,
    );
  }
  if (typeof uiScenario.behaviorScenario !== "string") {
    throw new Error(
      `${uiScenario.id} must reference a reducer-native behaviorScenario by relative source path.`,
    );
  }
  if (!isReducerNativeBehaviorScenario(behaviorScenario)) {
    throw new Error(
      `${uiScenario.id} behaviorScenario must use reducer-native setup/given/when arrays; function when, initialState, baseId, and from are not supported.`,
    );
  }
  const legacyBehaviorFields = ["initialState", "baseId", "from"].filter(
    (field) => behaviorScenario[field] !== undefined,
  );
  if (legacyBehaviorFields.length > 0) {
    throw new Error(
      `${uiScenario.id} behaviorScenario cannot author ${legacyBehaviorFields.join(", ")}; reducer-native setup is the only state authority.`,
    );
  }
}

function reducerNativeScenarioCheckpoint(uiScenario, behaviorScenario) {
  if (uiScenario.at === undefined) {
    return {
      segment: "given",
      completed: behaviorScenario.given.length,
    };
  }
  if (
    !isObject(uiScenario.at) ||
    !["setup", "given", "when"].includes(uiScenario.at.segment) ||
    !Number.isSafeInteger(uiScenario.at.completed) ||
    uiScenario.at.completed < 0 ||
    (uiScenario.at.segment === "setup" && uiScenario.at.completed !== 0)
  ) {
    throw new Error(
      `${uiScenario.id}.at must be { segment: "setup" | "given" | "when", completed: non-negative integer }.`,
    );
  }
  return {
    segment: uiScenario.at.segment,
    completed: uiScenario.at.completed,
  };
}

async function materializeBundledReducerNativeCheckpoint({
  gameDir,
  metadata,
  uiScenario,
  behaviorScenarioPath,
  checkpoint,
}) {
  const reducerPath = resolveWorkspaceEntry(
    gameDir,
    metadata.workspace.reducer,
    "reducer",
  );
  if (
    typeof behaviorScenarioPath !== "string" ||
    !existsSync(behaviorScenarioPath)
  ) {
    throw new Error(
      `${uiScenario.id} must reference its reducer-native behaviorScenario by relative source path.`,
    );
  }

  const compiled = await compileScenarioReplay({
    scenarioPath: behaviorScenarioPath,
    at: checkpoint,
  });

  const reducerSpecifier = toModuleSpecifier(
    path.join(gameDir, "__dreamboard_ui_checkpoint_entry__.ts"),
    reducerPath,
  );
  const source = [
    `import * as reducerModule from ${JSON.stringify(reducerSpecifier)};`,
    'import { materializeScenarioRuntimeCheckpoint } from "@dreamboard-games/sdk/testing-runtime";',
    "const game = reducerModule.game ?? reducerModule.default;",
    "export async function materialize(definition, checkpoint) {",
    "  if (!game) {",
    '    throw new Error("Reducer-native UI checkpoint entry is missing game authority.");',
    "  }",
    "  return materializeScenarioRuntimeCheckpoint({",
    "    game,",
    "    scenario: definition,",
    "    at: checkpoint,",
    "  });",
    "}",
  ].join("\n");

  const api = await loadEsbuild();
  const result = await api.build({
    absWorkingDir: gameDir,
    stdin: {
      contents: source,
      loader: "ts",
      resolveDir: gameDir,
      sourcefile: "__dreamboard_ui_checkpoint_entry__.ts",
    },
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node24",
    write: false,
    logLevel: "silent",
  });
  const output = result.outputFiles?.[0];
  if (!output) {
    throw new Error(
      `${uiScenario.id} reducer-native checkpoint bundle did not produce output.`,
    );
  }

  const cacheDir = path.join(
    gameDir,
    "node_modules/.cache/dreamboard-ui-fixtures",
  );
  const safeFixtureId = uiScenario.id.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
  const outputPath = path.join(cacheDir, `${safeFixtureId}.checkpoint.mjs`);
  await mkdir(cacheDir, { recursive: true });
  await writeFile(outputPath, output.text);
  const module = await import(
    `${pathToFileURL(outputPath).href}?checkpoint=${Date.now()}`
  );
  if (typeof module.materialize !== "function") {
    throw new Error(
      `${uiScenario.id} reducer-native checkpoint bundle is missing materialize().`,
    );
  }
  const materialized = await module.materialize(
    compiled.definition,
    compiled.checkpoint,
  );
  if (materialized.checkpointDigest !== compiled.expected.checkpointDigest) {
    throw new Error(
      `${uiScenario.id} materialized checkpoint digest ${materialized.checkpointDigest} does not match compiled replay ${compiled.expected.checkpointDigest}.`,
    );
  }
  return {
    ...materialized,
    compiledReplayEvidence: {
      sourceDigest: compiled.scenario.sourceDigest,
      checkpointDigest: compiled.expected.checkpointDigest,
      publicProjectionDigest: compiled.expected.publicProjectionDigest,
    },
  };
}

function replayForScenario(scenario, coverage, operations) {
  const replay = scenario.replay?.[0] ?? scenario.replay ?? coverage?.replay;
  if (replay) return replay;
  const submit = operations.find((operation) => operation.kind === "submit");
  if (submit?.interactionId) {
    return { kind: "invoke", interactionId: submit.interactionId };
  }
  return { kind: "invoke" };
}

function interactionIdForReplay(replay, operations) {
  return (
    replay.interactionId ??
    operations.find((operation) => operation.kind === "submit")
      ?.interactionId ??
    operations.find((operation) => operation.input?.interactionId)?.input
      ?.interactionId ??
    null
  );
}

function paramsForReplay(replay) {
  if (!replay || replay.kind === "invoke") return {};
  if (replay.kind === "multi-select") {
    return replay.params ?? { [replay.inputKey]: replay.cardIds };
  }
  if (replay.kind === "drag") {
    return {
      [replay.cardInputKey]: replay.cardId,
      [replay.destinationInputKey]: replay.destinationId,
    };
  }
  if (replay.kind === "draft") {
    return { [replay.inputKey]: replay.value };
  }
  if (replay.kind === "board-space") {
    return replay.params ?? { [replay.inputKey]: replay.spaceId };
  }
  if (replay.kind === "card-target") {
    return { [replay.inputKey]: replay.cardId };
  }
  if (replay.kind === "submit") {
    return replay.params ?? {};
  }
  return {};
}

function normalizeOperations({ scenario, replay, viewer }) {
  const rawOperations =
    scenario.authority?.operations ??
    scenario.operations ??
    (interactionIdForReplay(replay, [])
      ? [
          {
            kind: "submit",
            interactionId: interactionIdForReplay(replay, []),
            params: paramsForReplay(replay),
          },
        ]
      : []);
  const normalized = rawOperations.map((operation, index) => {
    if (operation.operation && operation.input) return operation;
    if (operation.kind === "submit") {
      return {
        id: operation.id ?? `${scenario.id}.submit-${index + 1}`,
        operation: "submit",
        input: {
          kind: "interaction",
          playerId:
            operation.playerId ??
            viewer.playerId ??
            viewer.seatId ??
            "player-1",
          interactionId: operation.interactionId,
          params: operation.params ?? paramsForReplay(replay),
        },
      };
    }
    throw new Error(
      `${scenario.id} has unsupported operation ${operation.kind}.`,
    );
  });
  return normalized.flatMap((operation) => {
    if (operation.operation !== "submit") return [operation];
    return [
      {
        ...operation,
        id: `${operation.id}.validate`,
        operation: "validate",
      },
      operation,
    ];
  });
}

async function materializeWorkspaceScenario({
  game,
  gameDir,
  metadata,
  scenario,
}) {
  if (metadata.schemaVersion !== 3) {
    throw new Error(
      `${scenario.id} reference-game UI compilation requires reference-game.json schemaVersion 3.`,
    );
  }

  const bundle = await loadWorkspaceReducerBundle({ gameDir, metadata });
  const loadedBehaviorScenario = await loadBehaviorScenario({
    gameDir,
    scenario,
  });
  const behaviorScenario = loadedBehaviorScenario.definition;
  const behaviorScenarioPath = loadedBehaviorScenario.sourcePath;
  assertReducerNativeReferenceUIScenario({
    uiScenario: scenario,
    behaviorScenario,
  });
  const materialized = await materializeBundledReducerNativeCheckpoint({
    gameDir,
    metadata,
    uiScenario: scenario,
    behaviorScenarioPath,
    checkpoint: reducerNativeScenarioCheckpoint(scenario, behaviorScenario),
  });
  const initialState = materialized.state;
  const resolvedPlayerIds = materialized.playerIds;
  const viewer = scenario.viewer ??
    behaviorScenario.viewer ?? {
      seatId: resolvedPlayerIds[0] ?? "player-1",
      playerId: resolvedPlayerIds[0] ?? "player-1",
    };
  const existingCoverage =
    behaviorScenarioCoverageMetadata(behaviorScenario) ?? {};
  const operationsSource = scenario.operations ?? [];
  const replay = replayForScenario(
    scenario,
    existingCoverage,
    operationsSource,
  );
  const interactionId = interactionIdForReplay(replay, operationsSource);
  const phaseName = initialState?.domain?.flow?.currentPhase;
  const interactionKey =
    interactionId && phaseName
      ? `${phaseName}.${interactionId}`
      : interactionId;
  const coverage = {
    ...existingCoverage,
    scenarioId: scenario.id,
    replay,
    ...(interactionId ? { interactionId } : {}),
    ...(interactionKey ? { interactionKey } : {}),
  };
  const referenceGame = {
    id: game.id,
    interactions: interactionId ? [{ id: interactionId }] : [],
  };

  return {
    ...scenario,
    ...(materialized.compiledReplayEvidence
      ? { __compiledReplayEvidence: materialized.compiledReplayEvidence }
      : {}),
    capabilities: scenario.capabilities ?? [],
    replay: scenario.replay ?? [],
    authority: {
      kind: "reducer",
      referenceGame,
      coverage,
      bundle,
      initialState,
      viewer,
      playerIds: resolvedPlayerIds,
      operations: normalizeOperations({ scenario, replay, viewer }),
    },
  };
}

async function executeAuthority({ gameDir, scenario, sourceModulePath }) {
  if (scenario.authority.kind === "protocol") {
    return executeProtocolAuthority(scenario);
  }
  const authority = await executeReducerAuthority(scenario);
  if (!authority.assertOnly && authority.sourceSteps.length === 0) {
    throw new Error(
      `${scenario.id} reducer replay did not produce any source request.`,
    );
  }
  const exercise = await exerciseRenderedScenario({
    gameDir,
    fixtureId: scenario.id,
    sourceModulePath,
    protocol: authority.protocol,
    sourceSteps: authority.sourceSteps,
    targetRequest: authority.targetRequest,
    interactionId: authority.interaction?.id ?? "__assert__",
    finalSubmit: authority.finalSubmit,
  });
  const finalFrame = authority.protocol.frames.find(
    (frame) => frame.id === exercise.finalFrameId,
  );
  if (!finalFrame) {
    throw new Error(
      `${scenario.id} did not produce runtime frame '${exercise.finalFrameId}'.`,
    );
  }
  const submissionDigest = digestUIFixtureJson(
    authority.assertOnly
      ? { fixtureId: scenario.id, replay: "assert" }
      : {
          fixtureId: scenario.id,
          interactionId: authority.interaction.id,
        },
  );
  return {
    ...authority,
    exercise,
    finalFrame,
    submissionDigest,
    replaySteps: authority.buildReplaySteps({
      exercise,
      finalFrame,
      submissionDigest,
      sourceSteps: authority.sourceSteps,
      targetRequest: authority.targetRequest,
    }),
  };
}

export async function compileScenarioModule({
  game,
  gameDir,
  scenario,
  outputRoot,
  sdkCommit,
}) {
  // The bundle index records commit provenance. Keep it out of the semantic
  // fixture digest so an unrelated repository commit cannot stale the catalog.
  void sdkCommit;
  const fixtureId = scenario.id;
  const renderModule = `modules/${fixtureId}.mjs`;
  const metadataPath = path.join(gameDir, "reference-game.json");
  const hasReferenceMetadata = existsSync(metadataPath);
  const metadata = hasReferenceMetadata ? await readJson(metadataPath) : null;
  const materializedScenario = metadata
    ? await materializeWorkspaceScenario({
        game,
        gameDir,
        metadata,
        scenario,
      })
    : scenario;
  const workspaceUiPath =
    metadata?.schemaVersion === 3
      ? path.join(gameDir, metadata.workspace.ui)
      : path.join(gameDir, "src", "ui.mjs");
  const workspaceAppPath = path.join(gameDir, "ui/App.tsx");
  const sourceModulePath =
    metadata?.schemaVersion === 3 && existsSync(workspaceAppPath)
      ? workspaceAppPath
      : workspaceUiPath;
  const referenceGame = materializedScenario.authority.referenceGame ?? game;
  const uiContractFingerprint = digestUIFixtureJson({
    gameId: game.id,
    interactions: referenceGame.interactions ?? [],
    uiPatterns: game.uiPatterns,
  });
  const modulePath = path.join(outputRoot, renderModule);
  const moduleSource = await format(
    await buildRenderModule({
      sourceModuleSpecifier: `${uiSourceModulePrefix}${path
        .relative(root, sourceModulePath)
        .split(path.sep)
        .join("/")}`,
      sourceExportName: await resolveUiSourceExport(sourceModulePath),
      uiContractFingerprint,
    }),
    { parser: "babel" },
  );
  await mkdir(path.dirname(modulePath), { recursive: true });
  await writeFile(modulePath, moduleSource);
  const renderModuleDigest = sha256Text(moduleSource);
  const exerciseModulePath = await buildExerciseUiModule({
    gameDir,
    sourceModulePath,
    fixtureId,
  });
  const authority = await executeAuthority({
    gameDir,
    scenario: materializedScenario,
    sourceModulePath: exerciseModulePath,
  });
  const viewportTags = viewportTagsForScenario(materializedScenario, fixtureId);

  const fixture = compileUIScenarioFixture({
    id: fixtureId,
    title:
      materializedScenario.title ??
      `${game.displayName ?? game.id}: ${fixtureId}`,
    gameId: game.id,
    tags: [...new Set([...game.mechanics, ...game.uiPatterns])],
    source: {
      scenarioId: fixtureId,
      reducerFingerprint: digestUIFixtureJson({
        gameId: game.id,
        authority: materializedScenario.authority.kind,
        interactions: referenceGame.interactions ?? [],
      }),
      uiContractFingerprint,
      renderModule,
      renderModuleDigest,
      sourceDigest: digestUIFixtureJson({
        scenarioSourceDigest:
          materializedScenario.__compiledReplayEvidence?.sourceDigest ?? null,
        uiScenarioId: fixtureId,
        sourceFiles: materializedScenario.sourceFiles,
        authority: materializedScenario.authority.kind,
      }),
      sourceFiles: [...materializedScenario.sourceFiles],
    },
    viewer: authority.viewer,
    environment: {
      clockIso: "2026-01-01T00:00:00.000Z",
      randomSeed: `${fixtureId}.seed`,
      locale: "en-US",
      timezone: "UTC",
      viewportTags,
    },
    protocol: authority.protocol,
    replay: authority.replaySteps,
    expected: {
      finalSemanticDigest: authority.exercise.finalSemanticDigest,
      submissionDigest: authority.submissionDigest,
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
    components: [...materializedScenario.contracts],
    capabilities: authority.capabilitiesForReplay(
      authority.replaySteps,
      viewportTags,
    ),
  };
}
