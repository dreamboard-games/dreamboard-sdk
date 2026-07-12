import type { DispatchTraceSummaryEntry } from "./reducer/diagnostics.js";
import {
  ScenarioReplayError,
  type ScenarioDefinition,
} from "./testing/definitions.js";
import type { ScenarioDefinitionGameLike } from "./testing/scenario-definition-validation.js";
import { assertScenario, replayScenario } from "./testing/scenario-replay.js";

// Internal published seam for CLI scenario loading and backend parity. These
// helpers intentionally do not appear on the author-facing `/testing` facade.
export { resolveScenarioCommandParams } from "./testing/scenario-player-refs.js";
export {
  digestScenarioProjection,
  scenarioProjectionInputMetadata,
  scenarioProjectionParityFromInspectNode,
  type ScenarioProjectionInteractionInput,
  type ScenarioProjectionParity,
} from "./testing/scenario-projection-digest.js";

export type CandidateVerificationScenario<
  Game extends ScenarioDefinitionGameLike,
> = ScenarioDefinition<Game>;

export type CandidateVerificationInput<
  Game extends ScenarioDefinitionGameLike,
> = {
  /** The authored reducer game definition used by production dispatch. */
  readonly reducer: Game;
  readonly scenarios:
    | Readonly<Record<string, CandidateVerificationScenario<Game>>>
    | readonly CandidateVerificationScenario<Game>[];
  readonly maxScenarios?: number;
  readonly maxStepsPerScenario?: number;
};

export type CandidateVerificationReplayDiagnostic = {
  readonly kind: "replay";
  readonly message: string;
  readonly scenarioId?: string;
  readonly segment?: "given" | "when";
  readonly index?: number;
  readonly interactionId?: string;
  readonly errorCode?: string;
  readonly reducerMessage?: string;
  readonly trace?: readonly DispatchTraceSummaryEntry[];
};

export type CandidateVerificationAssertionDiagnostic = {
  readonly kind: "assertion";
  readonly message: string;
};

export type CandidateVerificationLimitDiagnostic = {
  readonly kind: "limit";
  readonly message: string;
  readonly actualSteps: number;
  readonly maxStepsPerScenario: number;
};

export type CandidateVerificationScenarioResult = {
  readonly id: string;
  readonly status: "passed" | "failed";
  readonly diagnostic?:
    | CandidateVerificationReplayDiagnostic
    | CandidateVerificationAssertionDiagnostic
    | CandidateVerificationLimitDiagnostic;
};

export type CandidateVerificationResult = {
  readonly status: "passed" | "failed";
  readonly scenarioSummary: {
    readonly total: number;
    readonly passed: number;
    readonly failed: number;
    readonly scenarios: readonly CandidateVerificationScenarioResult[];
  };
};

const CANDIDATE_INPUT_FIELDS = new Set([
  "reducer",
  "scenarios",
  "maxScenarios",
  "maxStepsPerScenario",
]);
const MAX_DIAGNOSTIC_MESSAGE_LENGTH = 2_000;
const MAX_DIAGNOSTIC_TRACE_ENTRIES = 100;

export async function runCandidateVerification<
  const Game extends ScenarioDefinitionGameLike,
>(
  input: CandidateVerificationInput<Game>,
): Promise<CandidateVerificationResult> {
  assertCandidateInputFields(input);
  const scenarios = normalizeScenarios(input.scenarios);
  if (scenarios.length === 0) {
    throw new Error("Candidate verification requires at least one scenario.");
  }

  const maxScenarios = input.maxScenarios ?? scenarios.length;
  assertPositiveInteger(maxScenarios, "maxScenarios");
  if (scenarios.length > maxScenarios) {
    throw new Error(
      `Candidate verification contains ${scenarios.length} scenarios, exceeding limit ${maxScenarios}.`,
    );
  }

  const maxStepsPerScenario = input.maxStepsPerScenario ?? 1_000;
  assertPositiveInteger(maxStepsPerScenario, "maxStepsPerScenario");

  const results: CandidateVerificationScenarioResult[] = [];
  for (const scenario of scenarios) {
    results.push(
      await runScenario({
        reducer: input.reducer,
        scenario,
        maxStepsPerScenario,
      }),
    );
  }

  const failed = results.filter((result) => result.status === "failed").length;
  return {
    status: failed === 0 ? "passed" : "failed",
    scenarioSummary: {
      total: results.length,
      passed: results.length - failed,
      failed,
      scenarios: results,
    },
  };
}

async function runScenario<Game extends ScenarioDefinitionGameLike>(input: {
  readonly reducer: Game;
  readonly scenario: CandidateVerificationScenario<Game>;
  readonly maxStepsPerScenario: number;
}): Promise<CandidateVerificationScenarioResult> {
  const actualSteps = input.scenario.given.length + input.scenario.when.length;
  if (actualSteps > input.maxStepsPerScenario) {
    return {
      id: input.scenario.id,
      status: "failed",
      diagnostic: {
        kind: "limit",
        message:
          `Scenario contains ${actualSteps} replay steps, exceeding ` +
          `maxStepsPerScenario limit ${input.maxStepsPerScenario}.`,
        actualSteps,
        maxStepsPerScenario: input.maxStepsPerScenario,
      },
    };
  }

  let replay;
  try {
    replay = await replayScenario({
      game: input.reducer,
      scenario: input.scenario,
    });
  } catch (error) {
    return {
      id: input.scenario.id,
      status: "failed",
      diagnostic: replayDiagnostic(error),
    };
  }

  try {
    await assertScenario({ replay, assertion: input.scenario.then });
    return { id: input.scenario.id, status: "passed" };
  } catch (error) {
    return {
      id: input.scenario.id,
      status: "failed",
      diagnostic: {
        kind: "assertion",
        message: boundedMessage(error),
      },
    };
  }
}

function assertCandidateInputFields(input: object): void {
  for (const field of Object.keys(input)) {
    if (!CANDIDATE_INPUT_FIELDS.has(field)) {
      throw new Error(
        `Candidate verification input contains unsupported field '${field}'.`,
      );
    }
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive safe integer.`);
  }
}

function normalizeScenarios<Game extends ScenarioDefinitionGameLike>(
  input:
    | Readonly<Record<string, CandidateVerificationScenario<Game>>>
    | readonly CandidateVerificationScenario<Game>[],
): CandidateVerificationScenario<Game>[] {
  if (typeof input !== "object" || input === null) {
    throw new Error(
      "Candidate verification scenarios must be an array or record.",
    );
  }
  const scenarios = Array.isArray(input) ? [...input] : Object.values(input);
  const seenIds = new Set<string>();
  for (const scenario of scenarios) {
    if (typeof scenario?.id !== "string" || scenario.id.length === 0) {
      throw new Error("Candidate verification scenario id is required.");
    }
    if (seenIds.has(scenario.id)) {
      throw new Error(
        `Candidate verification scenario id '${scenario.id}' is duplicated.`,
      );
    }
    seenIds.add(scenario.id);
  }
  return scenarios;
}

function replayDiagnostic(
  error: unknown,
): CandidateVerificationReplayDiagnostic {
  if (error instanceof ScenarioReplayError) {
    return {
      kind: "replay",
      message: boundedMessage(error),
      scenarioId: error.scenarioId,
      segment: error.segment,
      index: error.index,
      interactionId: error.interactionId,
      errorCode: error.errorCode,
      ...(error.reducerMessage === undefined
        ? {}
        : { reducerMessage: boundedText(error.reducerMessage) }),
      trace: error.trace.slice(0, MAX_DIAGNOSTIC_TRACE_ENTRIES),
    };
  }
  return { kind: "replay", message: boundedMessage(error) };
}

function boundedMessage(error: unknown): string {
  return boundedText(error instanceof Error ? error.message : String(error));
}

function boundedText(value: string): string {
  return value.slice(0, MAX_DIAGNOSTIC_MESSAGE_LENGTH);
}
