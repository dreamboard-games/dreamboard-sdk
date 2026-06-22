import type { Wire } from "@dreamboard-games/reducer-contract";
import { createExpectApi } from "./testing/create-expect-api.js";
import { createTestRuntime } from "./testing/create-test-runtime.js";
import type {
  BaseContext,
  BaseDefinition,
  InteractionDescriptorLike,
  ScenarioDefinition,
  SharedScenarioContext,
} from "./testing/definitions.js";
import type { ReducerScenarioBundle } from "./testing/reducer-scenario/types.js";

type BaseStateArtifact = {
  readonly snapshot: Wire.ReducerSessionState;
  readonly fingerprint: {
    readonly players: number;
    readonly contractFingerprint?: string;
  };
};

export type CandidateVerificationBase =
  | BaseStateArtifact
  | (BaseDefinition & Partial<BaseStateArtifact>);

export type CandidateVerificationScenario = ScenarioDefinition;

export type CandidateVerificationInput = {
  readonly manifest?: unknown;
  readonly bases:
    | Readonly<Record<string, CandidateVerificationBase>>
    | readonly CandidateVerificationBase[];
  readonly scenarios:
    | Readonly<Record<string, CandidateVerificationScenario>>
    | readonly CandidateVerificationScenario[];
  readonly reducer: ReducerScenarioBundle;
  readonly maxScenarios?: number;
  readonly maxStepsPerScenario?: number;
};

export type CandidateVerificationScenarioResult = {
  readonly id: string;
  readonly status: "passed" | "failed";
  readonly diagnostic?: {
    readonly kind: "assertion";
    readonly message: string;
  };
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

export async function runCandidateVerification(
  input: CandidateVerificationInput,
): Promise<CandidateVerificationResult> {
  const bases = normalizeBases(input.bases);
  const scenarios = normalizeScenarios(input.scenarios);
  const maxScenarios = input.maxScenarios ?? scenarios.length;
  if (!Number.isInteger(maxScenarios) || maxScenarios < 1) {
    throw new Error("maxScenarios must be a positive integer.");
  }
  if (scenarios.length > maxScenarios) {
    throw new Error(
      `Candidate verification contains ${scenarios.length} scenarios, exceeding limit ${maxScenarios}.`,
    );
  }
  const maxStepsPerScenario = input.maxStepsPerScenario ?? 1000;
  if (!Number.isInteger(maxStepsPerScenario) || maxStepsPerScenario < 1) {
    throw new Error("maxStepsPerScenario must be a positive integer.");
  }

  const results: CandidateVerificationScenarioResult[] = [];
  for (const scenario of scenarios) {
    results.push(
      await runScenario({
        bases,
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

async function runScenario(input: {
  bases: Readonly<Record<string, BaseStateArtifact>>;
  reducer: ReducerScenarioBundle;
  scenario: CandidateVerificationScenario;
  maxStepsPerScenario: number;
}): Promise<CandidateVerificationScenarioResult> {
  const runtime = createTestRuntime({
    baseId: input.scenario.from,
    baseStates: input.bases,
    bundle: input.reducer,
    phase: input.scenario.phase,
    playerIds:
      input.bases[input.scenario.from]?.snapshot.domain?.flow?.activePlayers,
  });
  const ctx = createScenarioContext(runtime, input.maxStepsPerScenario);
  try {
    await input.scenario.when(ctx);
    await input.scenario.then(ctx);
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

function createScenarioContext(
  runtime: ReturnType<typeof createTestRuntime>,
  maxStepsPerScenario: number,
): SharedScenarioContext {
  let submittedSteps = 0;
  const baseContext: BaseContext = {
    game: {
      start: async () => undefined,
      submit: async (...args) => {
        submittedSteps += 1;
        if (submittedSteps > maxStepsPerScenario) {
          throw new Error(
            `Scenario exceeded maxStepsPerScenario limit ${maxStepsPerScenario}.`,
          );
        }
        return runtime.submit(...args);
      },
    },
    players: runtime.players,
    seat: runtime.seat,
  };
  return {
    ...baseContext,
    state: () => runtime.getFrame().flow.currentPhase ?? "",
    view: (playerId) => {
      const frame = runtime.getFrame();
      if (frame.perspectivePlayerId === playerId) return frame.view;
      return runtime.getFrame().view;
    },
    interactions: (playerId) => {
      const frame = runtime.getFrame();
      if (frame.perspectivePlayerId !== playerId) return [];
      return frame.availableInteractions as unknown as readonly InteractionDescriptorLike[];
    },
    explain: runtime.explain,
    diagnostics: runtime.diagnostics,
    expect: createExpectApi({
      lastDiagnosticRejection: () => {
        for (
          let index = runtime.diagnostics.events.length - 1;
          index >= 0;
          index -= 1
        ) {
          const event = runtime.diagnostics.events[index];
          if (event?.type === "submitRejected") return event;
        }
        return null;
      },
    }),
  };
}

function normalizeBases(
  input:
    | Readonly<Record<string, CandidateVerificationBase>>
    | readonly CandidateVerificationBase[],
): Record<string, BaseStateArtifact> {
  const entries = Array.isArray(input)
    ? input.map((base) => [base.id, base] as const)
    : Object.entries(input);
  return Object.fromEntries(
    entries.map(([id, base]) => {
      if (!id) throw new Error("Candidate verification base id is required.");
      if (!("snapshot" in base) || !base.snapshot) {
        throw new Error(`Candidate verification base '${id}' has no snapshot.`);
      }
      const players =
        base.fingerprint?.players ??
        base.players ??
        base.snapshot.domain?.flow?.activePlayers?.length ??
        1;
      return [
        id,
        {
          snapshot: base.snapshot,
          fingerprint: {
            players,
            contractFingerprint: base.fingerprint?.contractFingerprint,
          },
        },
      ];
    }),
  );
}

function normalizeScenarios(
  input:
    | Readonly<Record<string, CandidateVerificationScenario>>
    | readonly CandidateVerificationScenario[],
): CandidateVerificationScenario[] {
  const scenarios = Array.isArray(input) ? input : Object.values(input);
  return scenarios.map((scenario) => {
    if (!scenario.id)
      throw new Error("Candidate verification scenario id is required.");
    return scenario;
  });
}

function boundedMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 2000);
}
