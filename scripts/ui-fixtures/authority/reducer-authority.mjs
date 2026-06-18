import {
  compilePluginProtocolTape,
  createReducerScenarioRunner,
  digestUIFixtureRequest,
} from "../../../packages/sdk/dist/testing.js";

const gameplayScopeId = "runtime";
const defaultViewer = { seatId: "player-1", playerId: "player-1" };
const defaultPlayerIds = ["player-1"];

function scenarioReplay(coverage) {
  return coverage.replay ?? { kind: "invoke" };
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
  if (replay.kind === "board-space") {
    return {
      sourceSteps: [
        {
          exercise: "activate",
          request: {
            ...base,
            effect: {
              kind: "setCandidate",
              inputKey: replay.inputKey,
              candidateValue: replay.spaceId,
              beforeSelected: false,
              afterSelected: true,
            },
          },
        },
      ],
      finalSubmit: { kind: "semantic-submit" },
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
    const measuredSemanticDigest = exercise.stepSemanticDigests?.[index];
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
              ...(measuredSemanticDigest
                ? { semanticDigest: measuredSemanticDigest }
                : {}),
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
      ...(exercise.submitResolution
        ? {
            expectedIdentity: expectedIdentity(
              commitStepId,
              interaction.id,
              exercise.submitResolution,
            ),
          }
        : {}),
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
  const capabilities = new Set([
    "accessibility-scan",
    "reduced-motion",
    "runtime-submit",
  ]);
  if (replay.kind === "multi-select") {
    capabilities.add("runtime-draft");
  }
  if (replay.kind === "board-space") {
    capabilities.add("runtime-draft");
    capabilities.add("keyboard");
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
  const { bundle, coverage, initialState, operations, referenceGame } =
    scenario.authority;
  const viewer = scenario.authority.viewer ?? defaultViewer;
  const playerIds = scenario.authority.playerIds ?? defaultPlayerIds;
  const interaction = scenarioInteraction(referenceGame, coverage);
  const runner = createReducerScenarioRunner({
    scenarioId: coverage.scenarioId,
    gameId: referenceGame.id,
    initialState,
    bundle,
    viewer,
    playerIds,
  });
  const trace = await runner.run(operations);
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
