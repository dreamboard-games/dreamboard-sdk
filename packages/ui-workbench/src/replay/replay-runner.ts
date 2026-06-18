import type { BrowserInteractionSnapshot } from "@dreamboard-games/sdk/browser-interaction";
import {
  assertStepExpectation,
  createPreparationInstruction,
  createStepDiagnostics,
  planReplayStep,
  type ReplayExecutionInstruction,
  type ReplayStepMeasurement,
  type ReplayStepDiagnostics,
  type WorkbenchReplayStepEvidence,
  type WorkbenchSemanticReplayStep,
} from "./replay-plan.js";

export interface ReplayRunnerAdapter {
  readSnapshot(): Promise<BrowserInteractionSnapshot>;
  validate?(instruction: ReplayExecutionInstruction): Promise<void>;
  execute(instruction: ReplayExecutionInstruction): Promise<void>;
  flush(): Promise<void>;
  waitForExpectedState?(step: WorkbenchSemanticReplayStep): Promise<void>;
  measure(
    instruction: ReplayExecutionInstruction,
  ): Promise<ReplayStepMeasurement>;
}

export class ReplayStepExecutionError extends Error {
  readonly diagnostics: ReplayStepDiagnostics;
  readonly cause: unknown;

  constructor(
    step: WorkbenchSemanticReplayStep,
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
  step: WorkbenchSemanticReplayStep,
): Promise<WorkbenchReplayStepEvidence> {
  let diagnostics = createStepDiagnostics(step);
  try {
    let snapshot = await adapter.readSnapshot();
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
  steps: readonly WorkbenchSemanticReplayStep[],
): Promise<readonly WorkbenchReplayStepEvidence[]> {
  const evidence: WorkbenchReplayStepEvidence[] = [];
  for (const step of steps) {
    evidence.push(await runReplayStep(adapter, step));
  }
  return evidence;
}
