import { digestUIFixtureJson } from "../../../packages/sdk/dist/testing.js";

const defaultViewer = { seatId: "player-1", playerId: "player-1" };

function assertProtocolTape(tape, scenarioId) {
  if (!tape || typeof tape !== "object" || Array.isArray(tape)) {
    throw new Error(`${scenarioId} protocol authority must provide a tape.`);
  }
  if (!Array.isArray(tape.frames) || tape.frames.length === 0) {
    throw new Error(
      `${scenarioId} protocol authority tape must contain at least one frame.`,
    );
  }
  if (!Array.isArray(tape.steps) || tape.steps.length === 0) {
    throw new Error(
      `${scenarioId} protocol authority tape must contain at least one step.`,
    );
  }
}

function visibleInteractionKeys(frame) {
  return [
    ...new Set(
      (frame?.frame?.availableInteractions ?? []).map(
        (interaction) => interaction.interactionKey,
      ),
    ),
  ].sort();
}

export async function executeProtocolAuthority(scenario) {
  const { tape } = scenario.authority;
  assertProtocolTape(tape, scenario.id);
  const viewer = scenario.authority.viewer ?? defaultViewer;
  const finalFrame = tape.frames.at(-1);
  const finalSemanticDigest =
    scenario.authority.finalSemanticDigest ??
    digestUIFixtureJson({
      digestVersion: "protocol-authority-final-frame@1",
      scenarioId: scenario.id,
      frame: finalFrame,
    });
  const submissionDigest =
    scenario.authority.submissionDigest ??
    digestUIFixtureJson({
      digestVersion: "protocol-authority-submission@1",
      scenarioId: scenario.id,
      finalFrameId: finalFrame.id,
    });

  return {
    protocol: tape,
    viewer,
    exercise: {
      finalFrameId: finalFrame.id,
      finalSemanticDigest,
      visibleInteractionKeys: visibleInteractionKeys(finalFrame),
      renderedComponents: [],
    },
    finalFrame,
    submissionDigest,
    replaySteps: scenario.replay,
    capabilitiesForReplay(replaySteps, viewportTags) {
      const capabilities = new Set(scenario.capabilities ?? []);
      for (const step of replaySteps) {
        if (step.kind === "assert") continue;
        if (step.execute.kind === "activate") capabilities.add("click");
        if (step.execute.kind === "fill") capabilities.add("runtime-draft");
        if (step.execute.kind === "drag") {
          capabilities.add(
            viewportTags.includes("touch") ? "touch-drag" : "pointer-drag",
          );
        }
      }
      if (tape.steps.some((step) => step.kind === "client.submit")) {
        capabilities.add("runtime-submit");
      }
      return [...capabilities].sort();
    },
  };
}
