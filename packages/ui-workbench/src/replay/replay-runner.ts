import type { BrowserInteractionSnapshot } from "@dreamboard-games/sdk/browser-interaction";
import {
  assertSnapshotExpectation,
  assertStepExpectation,
  createPreparationInstruction,
  createStepDiagnostics,
  planReplayStep,
  type ReplayExecutionInstruction,
  type ReplayStepMeasurement,
  type ReplayStepDiagnostics,
  type WorkbenchReplayStepEvidence,
  type WorkbenchScenarioReplayStep,
} from "./replay-plan.js";

export interface ReplayRunnerAdapter {
  readSnapshot(): Promise<BrowserInteractionSnapshot>;
  validate?(instruction: ReplayExecutionInstruction): Promise<void>;
  execute(instruction: ReplayExecutionInstruction): Promise<void>;
  flush(): Promise<void>;
  waitForExpectedState?(step: WorkbenchScenarioReplayStep): Promise<void>;
  measure(
    instruction: ReplayExecutionInstruction,
  ): Promise<ReplayStepMeasurement>;
}

export class ReplayStepExecutionError extends Error {
  readonly diagnostics: ReplayStepDiagnostics;
  readonly cause: unknown;

  constructor(
    step: WorkbenchScenarioReplayStep,
    diagnostics: ReplayStepDiagnostics,
    cause: unknown,
  ) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`Replay step '${step.stepId}' failed: ${message}`);
    this.name = "ReplayStepExecutionError";
    this.diagnostics = diagnostics;
    this.cause = cause;
  }
}

export async function runReplayStep(
  adapter: ReplayRunnerAdapter,
  step: WorkbenchScenarioReplayStep,
): Promise<WorkbenchReplayStepEvidence> {
  let diagnostics = createStepDiagnostics(step);
  try {
    let snapshot = await adapter.readSnapshot();
    if (!("resolve" in step)) {
      await adapter.flush();
      await adapter.waitForExpectedState?.(step);
      snapshot = await adapter.readSnapshot();
      const measurement = await adapter.measure({
        stepId: step.stepId,
        source: {
          kind: "actuator",
          surface: "assert",
          scopeId: "assert",
          interactionKey: "assert",
          interactionId: "assert",
          actuator: {
            actuatorId: "assert",
            actuatorKind: "action",
            intent: "assert",
          },
        },
        execute: { kind: "activate" },
      } as unknown as ReplayExecutionInstruction);
      return assertSnapshotExpectation(
        step,
        snapshot,
        measurement,
        diagnostics,
      );
    }

    let plan = planReplayStep(snapshot, step);
    diagnostics = plan.diagnostics;

    if (plan.kind === "preparation") {
      for (const actuator of plan.preparation) {
        await adapter.execute(
          createPreparationInstruction(snapshot, step.stepId, actuator),
        );
        await adapter.flush();
        snapshot = await adapter.readSnapshot();
      }
      plan = planReplayStep(snapshot, step);
      diagnostics = plan.diagnostics;
    }

    if (plan.kind !== "execution") {
      throw new Error(
        `Replay step '${step.stepId}' did not produce execution.`,
      );
    }

    if (step.expect.submissionDigest) {
      await adapter.validate?.(plan.instruction);
    }
    await adapter.execute(plan.instruction);
    await adapter.flush();
    await adapter.waitForExpectedState?.(step);
    snapshot = await adapter.readSnapshot();
    const measurement = await adapter.measure(plan.instruction);
    return assertStepExpectation(
      step,
      plan.instruction.source,
      snapshot,
      measurement,
      diagnostics,
    );
  } catch (cause) {
    if (cause instanceof ReplayStepExecutionError) {
      throw cause;
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new ReplayStepExecutionError(
      step,
      { ...diagnostics, firstFailure: message },
      cause,
    );
  }
}

export async function runReplaySequence(
  adapter: ReplayRunnerAdapter,
  steps: readonly WorkbenchScenarioReplayStep[],
): Promise<readonly WorkbenchReplayStepEvidence[]> {
  const evidence: WorkbenchReplayStepEvidence[] = [];
  for (const step of steps) {
    evidence.push(await runReplayStep(adapter, step));
  }
  return evidence;
}
