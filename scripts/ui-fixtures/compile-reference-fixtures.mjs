#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  cp,
  mkdir,
  mkdtemp,
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
  referenceGamesRoot,
  repoCommandEnv,
  root,
  sha256File,
  writeJson,
} from "../ui/reference-games-lib.mjs";
import { discoverReferenceGameScenarioModules } from "./discover-scenarios.mjs";
import { executeReducerAuthority } from "./authority/reducer-authority.mjs";
import { loadScenarioModule } from "./load-scenario-module.mjs";
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
GlobalRegistrator.register();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function withTemporaryNodeModuleLinks(callback) {
  const links = [
    {
      link: path.join(root, "node_modules/@dreamboard-games/sdk"),
      target: path.join(root, "packages/sdk"),
    },
    {
      link: path.join(
        root,
        "node_modules/@dreamboard-games/plugin-runtime-contract",
      ),
      target: path.join(root, "packages/plugin-runtime-contract"),
    },
    {
      link: path.join(root, "node_modules/react"),
      target: path.dirname(sdkRequire.resolve("react/package.json")),
    },
  ];
  const created = [];
  for (const item of links) {
    try {
      await mkdir(path.dirname(item.link), { recursive: true });
      await symlink(item.target, item.link, "dir");
      created.push(item.link);
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
    }
  }
  try {
    return await callback();
  } finally {
    await Promise.all(
      created.reverse().map((link) => rm(link, { force: true })),
    );
  }
}

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

    const renderedComponents = collectRenderedComponents(container);
    const resolutions = [];
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
        const actuator = [...container.querySelectorAll("button")].find(
          (candidate) =>
            candidate.getAttribute("data-dreamboard-actuator-id") ===
              resolution.actuator.actuatorId &&
            candidate.getAttribute("data-dreamboard-actuator-enabled") ===
              "true",
        );
        if (!actuator) {
          throw new Error(
            `${fixtureId} could not find enabled actuator '${resolution.actuator.actuatorId}'.`,
          );
        }
        await act(async () => {
          actuator.click();
          await settleFixtureRuntime(harness);
        });
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

    await act(async () => {
      if (finalSubmit.kind === "semantic-submit") {
        const snapshot = readBrowserInteractionSnapshot(container);
        const submitRequest = {
          ...sourceSteps[0].request,
          intent: "submit",
        };
        delete submitRequest.effect;
        const submitResolution = resolveBrowserInteractionIntent(
          snapshot,
          submitRequest,
        );
        if (!submitResolution.ok) {
          throw new Error(
            `${fixtureId} semantic submit request did not resolve uniquely: ${submitResolution.code}`,
          );
        }
        const actuator = [...container.querySelectorAll("button")].find(
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
        actuator.click();
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
  }
}

async function compileScenarioModule({
  game,
  gameDir,
  scenario,
  outputRoot,
  sdkCommit,
}) {
  if (scenario.authority.kind !== "reducer") {
    throw new Error(`${scenario.id} protocol authority is not supported yet.`);
  }
  const coverage = scenario.authority.coverage;
  const referenceGame = scenario.authority.referenceGame;
  const fixtureId = coverage.scenarioId;
  const renderModule = `modules/${fixtureId}.mjs`;
  const publishedModulePath = path.join(fixturesRoot, renderModule);
  const uiContractFingerprint = digestUIFixtureJson({
    gameId: game.id,
    interactions: referenceGame.interactions,
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

  const authority = await executeReducerAuthority(scenario);
  const { protocol, interaction, sourceSteps, targetRequest, finalSubmit } =
    authority;
  if (sourceSteps.length === 0) {
    throw new Error(`${fixtureId} replay did not produce any source request.`);
  }
  const exercise = await exerciseRenderedScenario({
    fixtureId,
    sourceModulePath: path.join(gameDir, "src/ui.mjs"),
    protocol,
    sourceSteps,
    targetRequest,
    interactionId: `${interaction.id}:${authority.viewer.playerId}`,
    finalSubmit,
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
  const replaySteps = authority.buildReplaySteps({
    exercise,
    finalFrame,
    submissionDigest,
    sourceSteps,
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
        scenarioSourceFiles: scenario.sourceFiles,
        sdkCommit,
      }),
    },
    viewer: authority.viewer,
    environment: {
      clockIso: "2026-01-01T00:00:00.000Z",
      randomSeed: `${fixtureId}.seed`,
      locale: "en-US",
      timezone: "UTC",
      viewportTags,
    },
    protocol,
    replay: replaySteps,
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
    capabilities: authority.capabilitiesForReplay(replaySteps, viewportTags),
  };
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
  const modules = await discoverReferenceGameScenarioModules();
  for (const entry of modules) {
    fixtures.push(
      await compileScenarioModule({
        game: entry.game,
        gameDir: entry.gameDir,
        scenario: await loadScenarioModule(entry.modulePath),
        outputRoot,
        sdkCommit,
      }),
    );
  }
  await writeJson(path.join(outputRoot, "index.json"), {
    schemaVersion: 2,
    bundleId: `reference-games@${sdkCommit}`,
    sdkCommit,
    pluginRuntimeProtocol: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
    browserInteractionProtocol: browserInteractionProtocolVersion,
    fixtures: fixtures.sort((left, right) => left.id.localeCompare(right.id)),
  });
  return fixtures.length;
}

async function main() {
  const tmpRoot = await mkdtemp(
    path.join(os.tmpdir(), "dreamboard-ui-fixtures-"),
  );
  const first = path.join(tmpRoot, "first");
  const second = path.join(tmpRoot, "second");
  try {
    let fixtureCount = 0;
    await withTemporaryNodeModuleLinks(async () => {
      fixtureCount = await compileAll(first);
      await compileAll(second);
    });
    const firstHashes = JSON.stringify(await hashOutputFiles(first));
    const secondHashes = JSON.stringify(await hashOutputFiles(second));
    if (firstHashes !== secondHashes) {
      throw new Error("Reference UI fixture compilation is non-deterministic.");
    }

    await rm(fixturesRoot, { recursive: true, force: true });
    await mkdir(fixturesRoot, { recursive: true });
    await cp(first, fixturesRoot, { recursive: true });
    console.log(`compiled ${fixtureCount} UI fixtures`);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
