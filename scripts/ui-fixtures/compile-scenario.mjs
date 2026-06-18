import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "prettier";
import { root } from "../ui/reference-games-lib.mjs";
import { executeProtocolAuthority } from "./authority/protocol-authority.mjs";
import { executeReducerAuthority } from "./authority/reducer-authority.mjs";
import {
  FixturePluginRuntime,
  compileUIScenarioFixture,
  createFixtureHostHarness,
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
import { createPluginRuntimeClient } from "../../packages/sdk/dist/runtime.js";

const sdkRequire = createRequire(
  new URL("../../packages/sdk/package.json", import.meta.url),
);
const React = sdkRequire("react");
const { act } = React;
const { createRoot } = sdkRequire("react-dom/client");

const fixturesRoot = path.join(root, "fixtures/ui/reference-games");
const gameplayScopeId = "runtime";

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

function toModuleSpecifier(fromFile, toFile) {
  const relative = path
    .relative(path.dirname(fromFile), toFile)
    .split(path.sep)
    .join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

async function buildRenderModule({
  gameDir,
  modulePath,
  uiContractFingerprint,
}) {
  const sourceModule = toModuleSpecifier(
    modulePath,
    path.join(gameDir, "src/ui.mjs"),
  );
  return `export { Root } from ${JSON.stringify(sourceModule)};
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
  sourceModulePath,
  protocol,
  sourceSteps,
  targetRequest,
  interactionId,
  finalSubmit,
}) {
  const module = await import(
    `${pathToFileURL(sourceModulePath).href}?fixture=${encodeURIComponent(fixtureId)}`
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

    const resolutions = [];
    const stepSemanticDigests = [];
    for (const sourceStep of sourceSteps) {
      const sourceRequest = sourceStep.request;
      const snapshot = readBrowserInteractionSnapshot(container);
      const resolution =
        "effect" in sourceRequest
          ? resolveBrowserInteractionEffect(snapshot, sourceRequest)
          : resolveBrowserInteractionIntent(snapshot, sourceRequest);
      if (!resolution.ok) {
        throw new Error(
          `${fixtureId} semantic replay request did not resolve uniquely: ${resolution.code}`,
        );
      }
      resolutions.push(resolution);
      if (sourceStep.exercise === "activate") {
        const actuator = findEnabledActuator(
          container,
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
        const stepSnapshot = readBrowserInteractionSnapshot(container);
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
      const targetSnapshot = readBrowserInteractionSnapshot(container);
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

    const validation = await runtime.validateInteraction(interactionId, {});
    if (!validation.valid) {
      throw new Error(
        `${fixtureId} runtime validation failed: ${validation.errorCode ?? "invalid"}`,
      );
    }

    let submitResolution;
    await act(async () => {
      if (finalSubmit.kind === "semantic-submit") {
        const snapshot = readBrowserInteractionSnapshot(container);
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
            `${fixtureId} semantic submit request did not resolve uniquely: ${submitResolution.code}`,
          );
        }
        const actuator = [
          ...container.querySelectorAll("[data-dreamboard-actuator-id]"),
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
        await runtime.submitInteraction(interactionId, finalSubmit.params);
      }
      await settleFixtureRuntime(harness);
    });
    harness.assertConsumed();
    const finalSnapshot = readBrowserInteractionSnapshot(container);

    return {
      resolution: resolutions[0],
      resolutions,
      submitResolution,
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

async function executeAuthority({ scenario, gameDir }) {
  if (scenario.authority.kind === "protocol") {
    return executeProtocolAuthority(scenario);
  }
  const authority = await executeReducerAuthority(scenario);
  if (authority.sourceSteps.length === 0) {
    throw new Error(
      `${scenario.id} reducer replay did not produce any source request.`,
    );
  }
  const exercise = await exerciseRenderedScenario({
    fixtureId: scenario.id,
    sourceModulePath: path.join(gameDir, "src/ui.mjs"),
    protocol: authority.protocol,
    sourceSteps: authority.sourceSteps,
    targetRequest: authority.targetRequest,
    interactionId: `${authority.interaction.id}:${authority.viewer.playerId}`,
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
  const submissionDigest = digestUIFixtureJson({
    fixtureId: scenario.id,
    interactionId: `${authority.interaction.id}:player-1`,
  });
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
  const fixtureId = scenario.id;
  const renderModule = `modules/${fixtureId}.mjs`;
  const publishedModulePath = path.join(fixturesRoot, renderModule);
  const referenceGame = scenario.authority.referenceGame ?? game;
  const uiContractFingerprint = digestUIFixtureJson({
    gameId: game.id,
    interactions: referenceGame.interactions ?? [],
    uiPatterns: game.uiPatterns,
  });
  const modulePath = path.join(outputRoot, renderModule);
  const moduleSource = await format(
    await buildRenderModule({
      gameDir,
      modulePath: publishedModulePath,
      uiContractFingerprint,
    }),
    { parser: "babel" },
  );
  await mkdir(path.dirname(modulePath), { recursive: true });
  await writeFile(modulePath, moduleSource);
  const renderModuleDigest = sha256Text(moduleSource);
  const authority = await executeAuthority({ scenario, gameDir });
  const viewportTags = viewportTagsForScenario(scenario, fixtureId);

  const fixture = compileUIScenarioFixture({
    id: fixtureId,
    title: scenario.title ?? `${game.displayName ?? game.id}: ${fixtureId}`,
    gameId: game.id,
    tags: [...new Set([...game.mechanics, ...game.uiPatterns])],
    source: {
      scenarioId: fixtureId,
      reducerFingerprint: digestUIFixtureJson({
        gameId: game.id,
        authority: scenario.authority.kind,
        interactions: referenceGame.interactions ?? [],
      }),
      uiContractFingerprint,
      renderModule,
      renderModuleDigest,
      sourceDigest: digestUIFixtureJson({
        scenarioId: fixtureId,
        sourceFiles: scenario.sourceFiles,
        authority: scenario.authority.kind,
        sdkCommit,
      }),
      sourceFiles: [...scenario.sourceFiles],
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
    components: [...scenario.contracts],
    capabilities: authority.capabilitiesForReplay(
      authority.replaySteps,
      viewportTags,
    ),
  };
}
