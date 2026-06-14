import type {
  DispatchTraceSummaryEntry,
  ReducerDiagnosticEvent,
} from "../reducer/diagnostics.js";

export type TestRunner = "reducer" | "remote" | "browser";

export type InteractionDescriptorLike = {
  interactionId?: string;
  surface?: string;
  kind?: string;
  availability?: InteractionAvailabilityLike;
  context?: {
    to?: string;
  };
} & Record<string, unknown>;

export type InteractionAvailabilityLike =
  | { status: "available" }
  | { status: "notYourTurn"; reason: string }
  | {
      status: "insufficientResources";
      reason: string;
      missingResources?: Record<string, unknown>;
    }
  | { status: "blocked"; reason: string };

export type InteractionExplanationLike = {
  interactionId: string;
  phase: string;
  step: string | null;
  availability:
    | "available"
    | "notYourTurn"
    | "wrongPhase"
    | "wrongStep"
    | "blocked";
  rules: ReadonlyArray<{
    ruleId: string;
    outcome: "passed" | "failed" | "notEvaluated";
    errorCode?: string;
    message?: string;
  }>;
  actor: { required: readonly string[]; playerIsActor: boolean };
  inputs: ReadonlyArray<{
    key: string;
    kind: string;
    eligibleCount: number | "lazy";
  }>;
};

export type SnapshotMatcherHandler = (
  name: string | undefined,
  actual: unknown,
) => void;

export type RejectionExpectation = {
  errorCode?: string;
  message?: string | RegExp;
};

export type ExpectMatchers = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toMatchObject: (expected: Record<string, unknown>) => void;
  toBeDefined: () => void;
  toBeUndefined: () => void;
  toBeNull: () => void;
  toContain: (expected: unknown) => void;
  toContainEqual: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
  toThrow: (predicate?: string | RegExp | ((error: Error) => boolean)) => void;
  toMatchSnapshot: (filename?: string) => void;
  toRejectWith: (expected: RejectionExpectation) => Promise<void>;
  toHaveInteraction: (
    interactionId: string,
    opts?: Partial<InteractionDescriptorLike>,
  ) => void;
  toBeGatedBy: (reason: string, opts?: { interactionId?: string }) => void;
  toBeAvailable: (explanation?: InteractionExplanationLike) => void;
  toBeActiveFor: (playerId: string, opts?: { interactionId?: string }) => void;
  not: {
    toHaveInteraction: (interactionId: string) => void;
  };
};

export type ExpectFn = (actual: unknown) => ExpectMatchers;

export interface BaseContext<PlayerId extends string = string> {
  game: {
    start(): Promise<void>;
    patchState?(
      mutator: (state: Record<string, unknown>) => void,
    ): Promise<void>;
    submit(
      playerId: PlayerId,
      interactionId: string,
      params?: unknown,
    ): Promise<void>;
  };
  players(): readonly PlayerId[];
  seat(index: number): PlayerId;
}

export interface SharedScenarioContext<
  PlayerId extends string = string,
  StateName extends string = string,
  View = unknown,
  Descriptor extends InteractionDescriptorLike = InteractionDescriptorLike,
> extends BaseContext<PlayerId> {
  state(): StateName;
  view(playerId: PlayerId): View;
  interactions(playerId: PlayerId): readonly Descriptor[];
  explain(
    playerId: PlayerId,
    interactionId: string,
  ): InteractionExplanationLike;
  diagnostics: {
    readonly events: readonly ReducerDiagnosticEvent[];
    readonly lastDispatch: {
      submissionId: string;
      trace: readonly DispatchTraceSummaryEntry[];
    } | null;
    clear(): void;
  };
  expect: ExpectFn;
}

export interface BaseDefinition {
  id: string;
  seed?: number;
  players?: number;
  setupProfileId?: string | null;
  extends?: string;
  setup: (ctx: BaseContext) => void | Promise<void>;
}

export interface ScenarioDefinition<
  Runners extends readonly TestRunner[] = readonly ["reducer"],
  PhaseName extends string = string,
  StageName extends string = string,
> {
  id: string;
  description?: string;
  from: string;
  runners?: Runners;
  phase?: PhaseName;
  stage?: StageName;
  when: (ctx: SharedScenarioContext) => void | Promise<void>;
  then: (ctx: SharedScenarioContext) => void | Promise<void>;
}

export function defineBase<const Definition extends BaseDefinition>(
  definition: Definition,
): Definition {
  return definition;
}

export function defineScenario<
  const Runners extends readonly TestRunner[] = readonly ["reducer"],
  const PhaseName extends string = string,
  const StageName extends string = string,
>(
  definition: ScenarioDefinition<Runners, PhaseName, StageName>,
): ScenarioDefinition<Runners, PhaseName, StageName> {
  return definition;
}
