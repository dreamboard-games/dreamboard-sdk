import {
  compilePluginProtocolTape,
  createReducerScenarioRunner,
  digestUIFixtureJson,
  digestUIFixtureRequest,
} from "../../../packages/sdk/dist/testing.js";

const gameplayScopeId = "runtime";
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

function buildSourcePlan(coverage, interactionId) {
  const base = {
    surface: "gameplay",
    scopeId: gameplayScopeId,
    interactionKey: interactionId,
    interactionId: `${interactionId}:player-1`,
  };
  const replay = scenarioReplay(coverage);
  if (replay.kind === "multi-select") {
    return {
      sourceSteps: replay.cardIds.map((cardId) => ({
        exercise: "activate",
        request: {
          ...base,
          effect: {
            kind: "setCandidate",
            inputKey: replay.inputKey,
            candidateValue: cardId,
            beforeSelected: false,
            afterSelected: true,
          },
        },
      })),
      finalSubmit: { kind: "semantic-submit" },
    };
  }
  if (replay.kind === "drag") {
    return {
      sourceSteps: [
        {
          request: {
            ...base,
            effect: {
              kind: "setCandidate",
              inputKey: replay.cardInputKey,
              candidateValue: replay.cardId,
              beforeSelected: false,
              afterSelected: true,
            },
          },
        },
      ],
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
      finalSubmit: {
        kind: "runtime-submit",
        params: scenarioSubmissionParams(coverage),
      },
    };
  }
  if (replay.kind === "draft") {
    return {
      sourceSteps: [
        {
          request: {
            ...base,
            effect: {
              kind: "setScalar",
              inputKey: replay.inputKey,
              value: replay.value,
            },
          },
        },
      ],
      finalSubmit: {
        kind: "runtime-submit",
        params: scenarioSubmissionParams(coverage),
      },
    };
  }
  return {
    sourceSteps: [
      {
        request: {
          ...base,
          intent: "invoke",
        },
      },
    ],
    finalSubmit: {
      kind: "runtime-submit",
      params: {},
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

function buildReplaySteps({
  coverage,
  interaction,
  exercise,
  finalFrame,
  submissionDigest,
  sourceSteps,
  targetRequest,
}) {
  const replay = scenarioReplay(coverage);
  const fixtureId = coverage.scenarioId;
  const firstSteps = sourceSteps.map((sourceStep, index) => {
    const sourceRequest = sourceStep.request;
    const stepId =
      replay.kind === "invoke"
        ? `${fixtureId}.invoke`
        : replay.kind === "multi-select"
          ? `${fixtureId}.select-${String(index + 1).padStart(2, "0")}`
          : `${fixtureId}.${replay.kind}`;
    return {
      stepId,
      requestDigest: digestUIFixtureRequest(sourceRequest),
      resolve: sourceRequest,
      execute:
        replay.kind === "drag"
          ? { kind: "drag", target: targetRequest }
          : replay.kind === "draft"
            ? { kind: "fill", value: String(replay.value) }
            : { kind: "activate" },
      expectedIdentity: expectedIdentity(
        stepId,
        interaction.id,
        exercise.resolutions[index],
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
  });
  if (replay.kind === "invoke") return firstSteps;

  const commitStepId = `${fixtureId}.commit`;
  const commitRequest = {
    surface: "gameplay",
    scopeId: gameplayScopeId,
    interactionKey: interaction.id,
    interactionId: `${interaction.id}:player-1`,
    intent: "submit",
  };
  return [
    ...firstSteps,
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

function capabilitiesForReplay(replaySteps, viewportTags, coverage) {
  const replay = scenarioReplay(coverage);
  const capabilities = new Set(["runtime-submit"]);
  if (replay.kind === "multi-select") {
    capabilities.add("runtime-draft");
  }
  for (const step of replaySteps) {
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

export async function executeReducerAuthority(scenario) {
  const { referenceGame, coverage } = scenario.authority;
  const viewer = scenario.authority.viewer ?? defaultViewer;
  const playerIds = scenario.authority.playerIds ?? defaultPlayerIds;
  const interactionsByRef = buildInteractionDescriptors(
    referenceGame,
    coverage,
  );
  const interaction = scenarioInteraction(referenceGame, coverage);
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
  const bundle = {
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
  };
  const runner = createReducerScenarioRunner({
    scenarioId: coverage.scenarioId,
    gameId: referenceGame.id,
    initialState,
    bundle,
    viewer,
    playerIds,
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
  const protocol = compilePluginProtocolTape({
    trace,
    session: {
      sessionId: `${coverage.scenarioId}.fixture-session`,
      players: [{ playerId: viewer.playerId, displayName: "Player 1" }],
    },
  });
  return {
    coverage,
    protocol,
    interaction,
    viewer,
    ...buildSourcePlan(coverage, interaction.id),
    buildReplaySteps(options) {
      return buildReplaySteps({
        coverage,
        interaction,
        ...options,
      });
    },
    capabilitiesForReplay(replaySteps, viewportTags) {
      return capabilitiesForReplay(replaySteps, viewportTags, coverage);
    },
  };
}
