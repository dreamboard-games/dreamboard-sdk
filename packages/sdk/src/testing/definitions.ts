import type { z } from "zod";
import type {
  ClientParamsOfInteractionOfDefinition,
  GameStateOf,
  InteractionIdOfDefinitionPhase,
  InteractionSpecByNameOfDefinitionPhase,
  PhaseNamesOfDefinition,
  ViewNamesOfDefinition,
  ViewOfDefinition,
} from "../reducer/model/definition.js";
import type { ManifestIdSchema } from "../reducer/model/manifest.js";
import type {
  DispatchTraceSummaryEntry,
  ReducerDiagnosticEvent,
} from "../reducer/diagnostics.js";
import {
  validateScenarioDefinition,
  type ScenarioDefinitionGameLike,
} from "./scenario-definition-validation.js";

export {
  ScenarioDefinitionValidationError,
  type ScenarioDefinitionValidationCode,
} from "./scenario-definition-validation.js";

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

export type ScenarioSeatRef = {
  readonly seat: number;
};

export type ScenarioActor = ScenarioSeatRef;

export type ScenarioSetup = {
  readonly players: number;
  readonly seed: number;
  readonly setupProfileId?: string | null;
};

type ScenarioTupleOutput<
  Items extends readonly z.core.SomeType[],
  Rest extends z.core.SomeType | null,
> = Rest extends z.core.SomeType
  ? readonly [
      ...{ [Index in keyof Items]: ScenarioSchemaOutput<Items[Index]> },
      ...ScenarioSchemaOutput<Rest>[],
    ]
  : readonly [
      ...{ [Index in keyof Items]: ScenarioSchemaOutput<Items[Index]> },
    ];

type OptionalScenarioObjectKeys<Shape extends z.core.$ZodShape> = {
  [Key in keyof Shape]: undefined extends z.output<Shape[Key]> ? Key : never;
}[keyof Shape];

type ScenarioObjectOutput<Shape extends z.core.$ZodShape> = {
  readonly [Key in Exclude<
    keyof Shape,
    OptionalScenarioObjectKeys<Shape>
  >]: ScenarioSchemaOutput<Shape[Key]>;
} & {
  readonly [Key in OptionalScenarioObjectKeys<Shape>]?: ScenarioSchemaOutput<
    Shape[Key]
  >;
};

/**
 * Authoring projection of an input schema. Only semantic player-id leaves are
 * replaced; ordinary strings retain their original type.
 */
export type ScenarioSchemaOutput<Schema extends z.core.SomeType> =
  Schema extends ManifestIdSchema<unknown, "playerId">
    ? ScenarioSeatRef
    : Schema extends z.ZodOptional<infer Inner>
      ? ScenarioSchemaOutput<Inner> | undefined
      : Schema extends z.ZodExactOptional<infer Inner>
        ? ScenarioSchemaOutput<Inner> | undefined
        : Schema extends z.ZodNullable<infer Inner>
          ? ScenarioSchemaOutput<Inner> | null
          : Schema extends z.ZodDefault<infer Inner>
            ? ScenarioSchemaOutput<Inner>
            : Schema extends z.ZodPrefault<infer Inner>
              ? ScenarioSchemaOutput<Inner>
              : Schema extends z.ZodCatch<infer Inner>
                ? ScenarioSchemaOutput<Inner>
                : Schema extends z.ZodReadonly<infer Inner>
                  ? Readonly<ScenarioSchemaOutput<Inner>>
                  : Schema extends z.ZodNonOptional<infer Inner>
                    ? Exclude<ScenarioSchemaOutput<Inner>, undefined>
                    : Schema extends z.ZodArray<infer Element>
                      ? readonly ScenarioSchemaOutput<Element>[]
                      : Schema extends z.ZodTuple<infer Items, infer Rest>
                        ? ScenarioTupleOutput<Items, Rest>
                        : Schema extends z.ZodObject<infer Shape>
                          ? ScenarioObjectOutput<Shape>
                          : Schema extends z.ZodRecord<infer Key, infer Value>
                            ? Key extends ManifestIdSchema<unknown, "playerId">
                              ? never
                              : Readonly<
                                  Record<
                                    Extract<
                                      z.output<Key>,
                                      string | number | symbol
                                    >,
                                    ScenarioSchemaOutput<Value>
                                  >
                                >
                            : Schema extends z.ZodIntersection<
                                  infer Left,
                                  infer Right
                                >
                              ? ScenarioSchemaOutput<Left> &
                                  ScenarioSchemaOutput<Right>
                              : Schema extends z.ZodPipe<
                                    infer Input,
                                    infer _Output
                                  >
                                ? ScenarioSchemaOutput<Input>
                                : Schema extends z.ZodLazy<infer Inner>
                                  ? ScenarioSchemaOutput<Inner>
                                  : Schema extends z.ZodUnion<infer Options>
                                    ? ScenarioSchemaOutput<Options[number]>
                                    : z.output<Schema>;

type InputCollectorsOfInteraction<Interaction> = Interaction extends {
  readonly inputs?: infer Collectors;
}
  ? NonNullable<Collectors> extends Readonly<Record<string, unknown>>
    ? NonNullable<Collectors>
    : Record<string, never>
  : Record<string, never>;

type ScenarioParamsOfCollectors<
  Collectors extends Readonly<Record<string, unknown>>,
> = {
  readonly [Key in keyof Collectors as Collectors[Key] extends {
    readonly kind: "rng";
  }
    ? never
    : Key]: Collectors[Key] extends {
    readonly schema: infer Schema extends z.core.SomeType;
  }
    ? ScenarioSchemaOutput<Schema>
    : never;
};

type ScenarioParamsOfInteraction<Interaction> = Interaction extends {
  readonly cardType: unknown;
  readonly playFrom: unknown;
}
  ? { readonly cardId: string } & ScenarioParamsOfCollectors<
      InputCollectorsOfInteraction<Interaction>
    >
  : ScenarioParamsOfCollectors<InputCollectorsOfInteraction<Interaction>>;

export type ScenarioCommand<
  InteractionId extends string = string,
  Params = Record<string, unknown>,
> = {
  readonly actor: ScenarioActor;
  readonly interactionId: InteractionId;
  readonly params: Params;
};

type ScenarioCommandForPhase<
  Game,
  Phase extends PhaseNamesOfDefinition<Game>,
> = {
  [InteractionId in InteractionIdOfDefinitionPhase<
    Game,
    Phase
  >]: ScenarioCommand<
    InteractionId,
    ScenarioParamsOfInteraction<
      InteractionSpecByNameOfDefinitionPhase<Game, Phase, InteractionId>
    >
  >;
}[InteractionIdOfDefinitionPhase<Game, Phase>];

export type ScenarioCommandOf<Game> = {
  [Phase in PhaseNamesOfDefinition<Game>]: ScenarioCommandForPhase<Game, Phase>;
}[PhaseNamesOfDefinition<Game>];

/** Production params remain available for runtime implementors and diagnostics. */
export type RuntimeParamsOfScenarioCommand<
  Game,
  Phase extends PhaseNamesOfDefinition<Game>,
  InteractionId extends InteractionIdOfDefinitionPhase<Game, Phase>,
> = ClientParamsOfInteractionOfDefinition<Game, Phase, InteractionId>;

export type ScenarioReplayDefinition<Game> = {
  readonly id: string;
  readonly description?: string;
  readonly setup: ScenarioSetup;
  readonly given: readonly ScenarioCommandOf<Game>[];
  readonly when: readonly ScenarioCommandOf<Game>[];
};

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

type ScenarioPlayerView<Game> =
  Extract<"player", ViewNamesOfDefinition<Game>> extends infer ViewName
    ? ViewName extends ViewNamesOfDefinition<Game>
      ? ViewOfDefinition<Game, ViewName>
      : unknown
    : unknown;

export type ScenarioFlowDiagnostics = {
  readonly currentPhase: string | null;
  readonly currentStage: string | null;
  readonly activeSeats: readonly ScenarioSeatRef[];
};

export type ScenarioDiagnostics = {
  readonly events: readonly ReducerDiagnosticEvent[];
  readonly lastDispatch: {
    readonly submissionId: string;
    readonly trace: readonly DispatchTraceSummaryEntry[];
  } | null;
  readonly flow: ScenarioFlowDiagnostics;
};

export type ScenarioProbeAccepted<Game> = {
  readonly kind: "accepted";
  readonly command: ScenarioCommandOf<Game>;
  readonly checkpointDigest: string;
  readonly trace: readonly DispatchTraceSummaryEntry[];
  toBeAccepted(): void;
  toRejectWith(expected: RejectionExpectation): never;
};

export type ScenarioProbeRejected<Game> = {
  readonly kind: "rejected";
  readonly command: ScenarioCommandOf<Game>;
  readonly errorCode: string;
  readonly message?: string;
  readonly trace: readonly DispatchTraceSummaryEntry[];
  toBeAccepted(): never;
  toRejectWith(expected: RejectionExpectation): void;
};

export type ScenarioProbeResult<Game> =
  | ScenarioProbeAccepted<Game>
  | ScenarioProbeRejected<Game>;

export type ScenarioAssertionContext<Game> = {
  readonly expect: ExpectFn;
  state(): DeepReadonly<GameStateOf<Game>>;
  view(seat: ScenarioSeatRef): DeepReadonly<ScenarioPlayerView<Game>>;
  interactions(seat: ScenarioSeatRef): readonly InteractionDescriptorLike[];
  explain(
    seat: ScenarioSeatRef,
    interactionId: string,
  ): InteractionExplanationLike;
  readonly diagnostics: ScenarioDiagnostics;
  probe(command: ScenarioCommandOf<Game>): Promise<ScenarioProbeResult<Game>>;
};

export type ScenarioDefinition<Game> = ScenarioReplayDefinition<Game> & {
  readonly then: (
    context: ScenarioAssertionContext<Game>,
  ) => void | Promise<void>;
};

export type ScenarioCheckpoint =
  | { readonly segment: "setup"; readonly completed: 0 }
  | { readonly segment: "given"; readonly completed: number }
  | { readonly segment: "when"; readonly completed: number };

export type ScenarioReplaySegment = "given" | "when";

export type ScenarioCommandTraceEntry<Game> = {
  readonly segment: ScenarioReplaySegment;
  readonly index: number;
  readonly command: ScenarioCommandOf<Game>;
  readonly trace: readonly DispatchTraceSummaryEntry[];
};

export type ScenarioReplay<Game> = {
  readonly scenarioId: string;
  readonly checkpoint: ScenarioCheckpoint;
  readonly checkpointDigest: string;
  readonly complete: boolean;
  readonly trace: readonly ScenarioCommandTraceEntry<Game>[];
  state(): DeepReadonly<GameStateOf<Game>>;
  view(seat: ScenarioSeatRef): DeepReadonly<ScenarioPlayerView<Game>>;
  interactions(seat: ScenarioSeatRef): readonly InteractionDescriptorLike[];
  explain(
    seat: ScenarioSeatRef,
    interactionId: string,
  ): InteractionExplanationLike;
  readonly diagnostics: ScenarioDiagnostics;
  clone(): ScenarioReplay<Game>;
};

export type ReplayScenarioOptions<Game> = {
  readonly game: Game;
  readonly scenario: ScenarioReplayDefinition<Game>;
  readonly at?: ScenarioCheckpoint;
};

export type AssertScenarioOptions<Game> = {
  readonly replay: ScenarioReplay<Game>;
  readonly assertion: ScenarioDefinition<Game>["then"];
};

export type ScenarioReplayErrorOptions = {
  readonly scenarioId: string;
  readonly segment: ScenarioReplaySegment;
  readonly index: number;
  readonly interactionId: string;
  readonly errorCode: string;
  readonly reducerMessage?: string;
  readonly trace?: readonly DispatchTraceSummaryEntry[];
};

export class ScenarioReplayError extends Error {
  readonly scenarioId: string;
  readonly segment: ScenarioReplaySegment;
  readonly index: number;
  readonly interactionId: string;
  readonly errorCode: string;
  readonly reducerMessage?: string;
  readonly trace: readonly DispatchTraceSummaryEntry[];

  constructor(options: ScenarioReplayErrorOptions) {
    super(
      `Scenario '${options.scenarioId}' rejected ${options.segment}[${options.index}] ` +
        `interaction '${options.interactionId}' with ${options.errorCode}` +
        (options.reducerMessage ? `: ${options.reducerMessage}` : "."),
    );
    this.name = "ScenarioReplayError";
    this.scenarioId = options.scenarioId;
    this.segment = options.segment;
    this.index = options.index;
    this.interactionId = options.interactionId;
    this.errorCode = options.errorCode;
    this.reducerMessage = options.reducerMessage;
    this.trace = options.trace ?? [];
  }
}

type NoExtraScenarioFields<Actual, Expected> = Record<
  Exclude<keyof Actual, keyof Expected>,
  never
>;

export type ScenarioAuthoring<Game> = {
  defineScenario<const Definition extends ScenarioDefinition<Game>>(
    definition: Definition &
      NoExtraScenarioFields<Definition, ScenarioDefinition<Game>>,
  ): Definition;
};

export function createScenarioAuthoring<
  const Game extends ScenarioDefinitionGameLike,
>(game: Game): ScenarioAuthoring<Game> {
  return {
    defineScenario<const Definition extends ScenarioDefinition<Game>>(
      definition: Definition &
        NoExtraScenarioFields<Definition, ScenarioDefinition<Game>>,
    ): Definition {
      validateScenarioDefinition(game, definition);
      return definition;
    },
  };
}

/** Select and clone the only serializable portion of a loaded scenario. */
export function toScenarioReplayDefinition<Game>(
  definition: ScenarioDefinition<Game>,
): ScenarioReplayDefinition<Game> {
  const replay = {
    id: definition.id,
    ...(definition.description === undefined
      ? {}
      : { description: definition.description }),
    setup: definition.setup,
    given: definition.given,
    when: definition.when,
  } satisfies ScenarioReplayDefinition<Game>;
  return structuredClone(replay);
}
