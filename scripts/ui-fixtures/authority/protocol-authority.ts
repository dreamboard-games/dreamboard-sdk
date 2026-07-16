import { digestUIFixtureJson } from "../../../packages/sdk/dist/testing.js";

const defaultViewer = { seatId: "player-1", playerId: "player-1" };
type DynamicRecord = Record<string, any>;

function assertProtocolTape(
  tape: unknown,
  scenarioId: string,
): asserts tape is DynamicRecord {
  if (!tape || typeof tape !== "object" || Array.isArray(tape)) {
    throw new Error(`${scenarioId} protocol authority must provide a tape.`);
  }
  const value = tape as DynamicRecord;
  if (!Array.isArray(value.frames) || value.frames.length === 0) {
    throw new Error(
      `${scenarioId} protocol authority tape must contain at least one frame.`,
    );
  }
  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    throw new Error(
      `${scenarioId} protocol authority tape must contain at least one step.`,
    );
  }
}

function visibleInteractionKeys(frame: DynamicRecord): string[] {
  return [
    ...new Set<string>(
      (frame?.frame?.availableInteractions ?? []).map(
        (interaction: DynamicRecord) => String(interaction.interactionKey),
      ),
    ),
  ].sort();
}

export async function executeProtocolAuthority(
  scenario: DynamicRecord,
): Promise<DynamicRecord> {
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
    capabilitiesForReplay(
      replaySteps: readonly DynamicRecord[],
      viewportTags: readonly string[],
    ) {
      const capabilities = new Set([
        ...(scenario.capabilities ?? []),
        "accessibility-scan",
        "reduced-motion",
      ]);
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
      if (
        tape.steps.some((step: DynamicRecord) => step.kind === "client.submit")
      ) {
        capabilities.add("runtime-submit");
      }
      return [...capabilities].sort();
    },
  };
}
