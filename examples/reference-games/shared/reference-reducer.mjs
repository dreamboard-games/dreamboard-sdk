import { digestUIFixtureJson } from "@dreamboard-games/sdk/testing";

const defaultViewer = { seatId: "player-1", playerId: "player-1" };
const defaultPlayerIds = ["player-1"];

function scenarioReplay(coverage) {
  return coverage.replay ?? { kind: "invoke" };
}

function scenarioInputs(coverage) {
  const replay = scenarioReplay(coverage);
  if (replay.kind === "multi-select") {
    return [
      {
        key: replay.inputKey,
        kind: "cardTarget",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          zoneId: "hand",
          eligibleTargets: replay.eligibleCardIds,
          selection: {
            mode: "many",
            min: replay.min,
            max: replay.max,
            distinct: true,
          },
        },
      },
    ];
  }
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
  if (replay.kind === "multi-select") {
    return { [replay.inputKey]: replay.cardIds };
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
  return {};
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
  if (replay.kind === "multi-select") {
    const cardViewsById = Object.fromEntries(
      replay.eligibleCardIds.map((cardId) => [
        cardId,
        JSON.stringify({
          id: cardId,
          cardType: "playing-card",
          name: cardId
            .split("-")
            .map((part) => part[0].toUpperCase() + part.slice(1))
            .join(" "),
          properties: {},
        }),
      ]),
    );
    return {
      hand: {
        cardIds: replay.eligibleCardIds,
        cardViewsById,
        playableByCardId: Object.fromEntries(
          replay.eligibleCardIds.map((cardId) => [cardId, [interaction.id]]),
        ),
      },
    };
  }
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

export function createReferenceReducerScenario({
  referenceGame,
  coverage,
  viewer = defaultViewer,
  playerIds = defaultPlayerIds,
}) {
  const interactionsByRef = buildInteractionDescriptors(
    referenceGame,
    coverage,
  );
  const interaction = scenarioInteraction(referenceGame, coverage);
  const initialState = {
    domain: {
      flow: {
        currentPhase: coverage.scenarioId,
        activePlayers: [viewer.playerId],
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
  const validationInput = {
    kind: "interaction",
    playerId: viewer.playerId,
    interactionId: `${interaction.id}:${viewer.playerId}`,
    params: {},
  };
  const submissionInput = {
    ...validationInput,
    params: scenarioSubmissionParams(coverage),
  };
  return {
    viewer,
    playerIds,
    initialState,
    operations: [
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
    ],
    bundle: {
      projectSeatsDynamic({ state }) {
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
            (descriptor) =>
              descriptor.interactionId === candidate.interactionId,
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
                activePlayers: [viewer.playerId],
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
    },
  };
}
