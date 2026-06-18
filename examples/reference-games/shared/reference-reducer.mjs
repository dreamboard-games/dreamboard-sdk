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
  if (replay.kind === "board-space") {
    return [
      {
        key: replay.inputKey,
        kind: "boardTarget",
        domain: {
          type: "boardTarget",
          projection: "resolved",
          targetKind: "space",
          eligibleTargets: replay.eligibleSpaceIds,
          selection: { mode: "single" },
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
  if (replay.kind === "board-space") {
    return { [replay.inputKey]: replay.spaceId };
  }
  return {};
}

function humanizeProcedureId(id) {
  return id
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function scenarioProcedureIds(coverage) {
  if (Array.isArray(coverage.systemEventProcedureIds)) {
    return coverage.systemEventProcedureIds;
  }
  const scenarios = coverage.scenarios ?? {};
  if (Array.isArray(scenarios.weather?.procedureIds)) {
    return scenarios.weather.procedureIds;
  }
  if (Array.isArray(scenarios.claimHighest?.eventProcedureIds)) {
    return scenarios.claimHighest.eventProcedureIds;
  }
  return [];
}

function scenarioSystemEvents(coverage) {
  return scenarioProcedureIds(coverage).map((procedureId, index) => ({
    kind: "systemAction",
    procedureId,
    title: humanizeProcedureId(procedureId),
    summary: `${coverage.scenarioId} recorded ${procedureId}.`,
    details: [{ label: "Scenario", value: coverage.scenarioId }],
    version: 1,
    index,
  }));
}

function scenarioBranch(referenceGame, coverage) {
  const key = coverage.scenarioKey;
  if (typeof key === "string" && referenceGame.scenarios?.[key]) {
    return {
      key,
      ...referenceGame.scenarios[key],
    };
  }
  return null;
}

function scenarioInteraction(referenceGame, coverage) {
  const explicitInteractionId =
    coverage.interactionId ?? scenarioReplay(coverage).interactionId;
  const interaction =
    referenceGame.interactions.find(
      (candidate) => candidate.id === explicitInteractionId,
    ) ??
    referenceGame.interactions.find((candidate) =>
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
        label:
          interaction.label ??
          interaction.id
            .split("-")
            .map((part) => part[0].toUpperCase() + part.slice(1))
            .join(" "),
        ...(interaction.help ? { help: interaction.help } : {}),
        kind: "action",
        availability: interaction.blockedReason
          ? {
              status: "blocked",
              reason: interaction.blockedReason,
              ...(interaction.blockedCode
                ? { code: interaction.blockedCode }
                : {}),
            }
          : { status: "available" },
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
  const branch = scenarioBranch(referenceGame, coverage);
  const initialRecentEvents = scenarioSystemEvents({
    ...coverage,
    systemEventProcedureIds: coverage.initialSystemEventProcedureIds,
  });
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
        scenarioBranch: branch,
        submittedInteractionId: null,
        recentEvents: initialRecentEvents,
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
          guidance: referenceGame.guidance ?? {
            phase: {
              id: state.domain.flow.currentPhase,
              label: referenceGame.displayName,
            },
          },
          recentEvents: state.domain.publicState.recentEvents ?? [],
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
                recentEvents: scenarioSystemEvents(coverage),
              },
            },
          },
          trace: [],
        };
      },
    },
  };
}
