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
    "sha256:e32dcc9c8992d5b795a6fa6b76f8720d29b8cb9149a83d4a9e7c64cdaad20f6a",
  "ui-scenarios.cards-hand.desktop":
    "sha256:5514837becaaf6fd33823feaba7bed807fe43f9eb2244b36f0bc1ea071ab911a",
  "ui-scenarios.dice-result.desktop":
    "sha256:74e12ccca1837405e44d50baa03d5efa1eee8b91b7a2b055b6627154ce10c02b",
  "ui-scenarios.game-shell.desktop":
    "sha256:46204b9a117b7891555b33ef6ed7b8d0a2dfd258fe883a16e8a63ac93211519f",
  "ui-scenarios.prompts-choice.desktop":
    "sha256:0b8f77adb851955366ae13fa12db832e806a1950ff32975be47d4410ddcd6e28",
  "ui-scenarios.resources-cost.desktop":
    "sha256:375167a807a7fd8cdf00ca35eca7df6f11cd13650e00cae91cad5b6127828488",
  "ui-scenarios.zones-staging.desktop":
    "sha256:5995680b7da3c5b984b171172f2da4a2008b9a207be6fe628386afee93521434",
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
      view,
      flow: {
        currentPhase: view.phase ?? "inspect",
        currentStage: view.stage ?? "inspect",
        activePlayers: [playerId],
        simultaneousPhase: null,
      },
      availableInteractions: [interactionDescriptor(scenarioId)],
      zones: {},
    },
  };
}

function interactionDescriptor(scenarioId) {
  const descriptor = {
    phaseName: "inspect",
    interactionKey,
    interactionId,
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
