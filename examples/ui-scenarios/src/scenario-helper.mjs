import {
  defineUIScenario,
  digestUIFixtureJson,
  digestUIFixtureRequest,
  digestUIFixtureTransportRequest,
} from "@dreamboard-games/sdk/testing";

const playerId = "player-1";
const interactionKey = "inspect";
const interactionId = `${interactionKey}:${playerId}`;
const browserSemanticDigests = {
  "ui-scenarios.boards-slot.desktop":
    "sha256:145e0127978ace926637702d67745a6331407bffc30b5b89da9fd67906579fa3",
  "ui-scenarios.cards-hand.desktop":
    "sha256:365a0fac0835530df450fc062070b9da0fb06a088ea9c9cfc3842a91cd8ba65b",
  "ui-scenarios.dice-result.desktop":
    "sha256:1a10c8269beb45be3ff94eeaf46b2e8d4016526e08565a3dcb697f9a5f668ba0",
  "ui-scenarios.game-shell.desktop":
    "sha256:5eef31cb0727e2f13a3cd5a3e0fb9b6380e01fc61eacb4d1faeb861b864f364f",
  "ui-scenarios.prompts-choice.desktop":
    "sha256:9cfb246e899fa1b2619958930cf88b14145cb651e05f996b01825364d44f2f4a",
  "ui-scenarios.resources-cost.desktop":
    "sha256:3cf166cb66b1caa9d43942a5c4d98ce95746b9081af691576c0d563533b6b2ff",
  "ui-scenarios.zones-staging.desktop":
    "sha256:ce95f5ad89261cd936f5c491007b7c1f2671435f445e4cce5535b132986a2386",
};

function digest(seed) {
  return digestUIFixtureJson(seed);
}

function frame({ id, scenarioId, version, view }) {
  return {
    id,
    projectionDigest: digest({
      digestVersion: "primitive-protocol-frame@1",
      scenarioId,
      frameId: id,
      view,
    }),
    frame: {
      gameVersion: version,
      actionSetVersion: digest({
        digestVersion: "primitive-protocol-action-set@1",
        scenarioId,
        version,
      }),
      perspectivePlayerId: playerId,
      sharedView: { boardStatic: null, dynamicView: {} },
      view,
      flow: {
        currentPhase: view.phase ?? "inspect",
        currentStage: view.stage ?? "inspect",
        activePlayers: [playerId],
        simultaneousPhase: null,
      },
      availableInteractions: [interactionDescriptor(scenarioId)],
      zones: {},
      recentEvents: [],
    },
  };
}

function interactionDescriptor(scenarioId) {
  const descriptor = {
    phaseName: "inspect",
    interactionKey,
    interactionId,
    label: "Inspect",
    kind: "action",
    availability: { status: "available" },
    commit: { mode: "manual" },
    inputs: [],
  };
  return {
    ...descriptor,
    descriptorDigest: digest({
      digestVersion: "primitive-protocol-descriptor@1",
      scenarioId,
      descriptor,
    }),
  };
}

function transportDigest(operation, sourceFrame) {
  return digestUIFixtureTransportRequest({
    operation,
    basis: {
      gameVersion: sourceFrame.frame.gameVersion,
      actionSetVersion: sourceFrame.frame.actionSetVersion,
      perspectivePlayerId: sourceFrame.frame.perspectivePlayerId,
    },
    interactionId,
    payload: {},
  });
}

export function createPrimitiveScenario({
  id,
  title,
  contracts,
  capabilities = ["click", "runtime-submit"],
  viewport = "desktop",
  input = ["mouse"],
  sourceFiles,
  view,
}) {
  const initialFrame = frame({
    id: `${id}.initial`,
    scenarioId: id,
    version: 1,
    view: { ...view, scenarioId: id, submitted: false },
  });
  const finalFrame = frame({
    id: `${id}.submitted`,
    scenarioId: id,
    version: 2,
    view: { ...view, scenarioId: id, submitted: true },
  });
  const resolve = {
    surface: "gameplay",
    scopeId: "runtime",
    interactionKey,
    interactionId,
    intent: "invoke",
  };
  const submissionDigest = digest({
    fixtureId: id,
    interactionId,
  });
  const semanticDigest = browserSemanticDigests[id];
  if (!semanticDigest) {
    throw new Error(`${id} is missing a measured browser semantic digest.`);
  }

  return defineUIScenario({
    id,
    gameId: "ui-scenarios",
    title,
    contracts,
    capabilities,
    sourceFiles: [
      "examples/ui-scenarios/package.json",
      "examples/ui-scenarios/src/scenario-helper.mjs",
      "examples/ui-scenarios/src/ui.mjs",
      ...sourceFiles,
    ],
    environment: {
      viewport,
      browsers: viewport === "phone" ? ["chromium", "webkit"] : ["chromium"],
      input,
    },
    authority: {
      kind: "protocol",
      viewer: { seatId: playerId, playerId },
      finalSemanticDigest: semanticDigest,
      submissionDigest,
      tape: {
        session: {
          sessionId: `${id}.session`,
          players: [{ playerId, displayName: "Player 1" }],
        },
        frames: [initialFrame, finalFrame],
        steps: [
          {
            id: `${id}.initial.host-frame`,
            kind: "host.frame",
            frameId: initialFrame.id,
          },
          {
            id: `${id}.validate`,
            kind: "client.validate",
            fromFrameId: initialFrame.id,
            requestDigest: transportDigest("validate", initialFrame),
            response: { valid: true },
          },
          {
            id: `${id}.submit`,
            kind: "client.submit",
            fromFrameId: initialFrame.id,
            requestDigest: transportDigest("submit", initialFrame),
            response: { accepted: true },
          },
          {
            id: `${id}.submitted.host-frame`,
            kind: "host.frame",
            frameId: finalFrame.id,
          },
        ],
      },
    },
    replay: [
      {
        stepId: `${id}.submit`,
        requestDigest: digestUIFixtureRequest(resolve),
        resolve,
        execute: { kind: "activate" },
        expect: {
          frameId: finalFrame.id,
          projectionDigest: finalFrame.projectionDigest,
          semanticDigest,
          submissionDigest,
          visibleInteractionKeys: [interactionKey],
        },
      },
    ],
  });
}
