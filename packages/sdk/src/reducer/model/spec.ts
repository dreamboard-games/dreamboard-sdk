import type { z } from "zod";
import type {
  AnySchema,
  RuntimeTableRecord,
  SchemaLike,
  StringKeyOf,
} from "./table";
import type { ManifestContract } from "./manifest";
import type {
  CardIdOfState,
  CardTypeOfState,
  PhaseNameOfState,
  PhaseStepOfState,
  PlayerIdOfState,
  PlayerZoneIdOfManifest,
  TableOfState,
  SetupSelectionOfManifest,
} from "./extract";
import type {
  AnyContinuationToken,
  ContinuationToken,
  ReducerAccept,
  ReducerFx,
  ReducerReject,
  ReducerResult,
  ReducerRuntimeStateForState,
} from "./runtime";
import type { RuntimeInstructionForState } from "../core/runtime-instruction";
import type { TableQueriesOfState } from "./queries";
import type { ReducerOps } from "../ops";
import type { ReducerTransaction } from "../transaction";
import type { DerivedResolver } from "../derived";

type StaticBoardsOfManifest<Manifest> = Manifest extends {
  staticBoards?: infer StaticBoards;
}
  ? NonNullable<StaticBoards>
  : {
      byId: Record<string, never>;
      hex: Record<string, never>;
      square: Record<string, never>;
    };

type StaticBoardMapOfManifest<Manifest> =
  StaticBoardsOfManifest<Manifest> extends {
    byId: infer Boards;
  }
    ? Boards
    : Record<string, never>;

type StaticHexBoardMapOfManifest<Manifest> =
  StaticBoardsOfManifest<Manifest> extends {
    hex: infer Boards;
  }
    ? Boards
    : Record<string, never>;

type StaticSquareBoardMapOfManifest<Manifest> =
  StaticBoardsOfManifest<Manifest> extends {
    square: infer Boards;
  }
    ? Boards
    : Record<string, never>;

export type StaticViewQueries<
  Manifest extends ManifestContract<RuntimeTableRecord>,
> = {
  board: {
    get: <BoardId extends StringKeyOf<StaticBoardMapOfManifest<Manifest>>>(
      boardId: BoardId,
    ) => StaticBoardMapOfManifest<Manifest>[BoardId];
    hex: <BoardId extends StringKeyOf<StaticHexBoardMapOfManifest<Manifest>>>(
      boardId: BoardId,
    ) => StaticHexBoardMapOfManifest<Manifest>[BoardId];
    square: <
      BoardId extends StringKeyOf<StaticSquareBoardMapOfManifest<Manifest>>,
    >(
      boardId: BoardId,
    ) => StaticSquareBoardMapOfManifest<Manifest>[BoardId];
  };
};

// --- Continuation Input Types ---

// Engine-level routing kind. Retained as a single-value alias for clarity at
// engine boundaries; every continuation is effect-sourced in the canonical
// SDK.
export type ContinuationSourceKind = "effect";

// Names of engine effects that can resume a typed continuation.
export type ResumableEffectKind =
  | "rollDie"
  | "shuffleSharedZone"
  | "shufflePlayerZone";

// Internal tag shared between the continuation callable and the engine.
export type ContinuationKind = ResumableEffectKind;

// Per-effect response shapes. These are produced by the engine after an effect
// runs and delivered back to the continuation's reduce callback as input.response.
export type RollDieContinuationResponse = {
  dieId: string;
  value: number;
};

export type ShuffleSharedZoneContinuationResponse = {
  zoneId: string;
  orderedCardIds: readonly string[];
};

export type ShufflePlayerZoneContinuationResponse = {
  zoneId: string;
  playerId: string;
  orderedCardIds: readonly string[];
};

export type EffectContinuationResponse<Kind extends ResumableEffectKind> =
  Kind extends "rollDie"
    ? RollDieContinuationResponse
    : Kind extends "shuffleSharedZone"
      ? ShuffleSharedZoneContinuationResponse
      : Kind extends "shufflePlayerZone"
        ? ShufflePlayerZoneContinuationResponse
        : never;

export type EffectContinuationInput<
  DataSchema extends AnySchema,
  Kind extends ResumableEffectKind = ResumableEffectKind,
> = {
  source: "effect";
  effectKind: Kind;
  data: z.infer<DataSchema>;
  response: EffectContinuationResponse<Kind>;
};

export type ContinuationInput<DataSchema extends AnySchema> =
  EffectContinuationInput<DataSchema, ResumableEffectKind>;

export type ContinuationInputForSource<
  DataSchema extends AnySchema,
  EffectType extends ResumableEffectKind = ResumableEffectKind,
> = EffectContinuationInput<DataSchema, EffectType>;

// --- Context Types ---

export type PhaseEnterContext = {
  event: "initialize" | "transition";
};

type BivariantCallback<Args, Result> = {
  bivarianceHack(args: Args): Result;
}["bivarianceHack"];

export type ActionContext<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = {
  currentPhase: PhaseNameOfState<State>;
  manifest: Manifest;
  playerOrder: PlayerIdOfState<State>[];
  activePlayers: PlayerIdOfState<State>[];
  runtime: Omit<ReducerRuntimeStateForState<State>, "rng">;
  setup: SetupSelectionOfManifest<Manifest> | null;
};

export type ValidationIssue = {
  errorCode: string;
  message?: string;
};

export type RuntimeHelpers<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
> = {
  accept(
    state: State,
    instructions?: RuntimeInstructionForState<State>[],
  ): ReducerAccept<State>;
  reject: (errorCode: string, message?: string) => ReducerReject;
  fx: ReducerFx<State>;
  ops: ReducerOps<State>;
  edit<DraftState extends State>(
    state: DraftState,
  ): ReducerTransaction<DraftState>;
  q: TableQueriesOfState<State>;
  derived: DerivedResolver;
};

export type RandomHelpers = {
  subset<const Values extends readonly unknown[]>(options: {
    from: Values;
    count: number;
  }): readonly Values[number][];
};

export type MutationRuntimeHelpers = {
  random: RandomHelpers;
};

export type PhaseEnterArgs<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> &
  RuntimeHelpers<State> &
  MutationRuntimeHelpers &
  PhaseEnterContext & {
    state: State;
  };

export type ActorSelectorArgs<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> &
  RuntimeHelpers<State> & {
    state: State;
  };

export type ActorSelection<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
> =
  | PlayerIdOfState<State>
  | readonly PlayerIdOfState<State>[]
  | null
  | undefined;

export type ActorSelector<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = BivariantCallback<
  ActorSelectorArgs<State, Manifest>,
  ActorSelection<State>
>;

export type ContinuationReduceArgs<
  DataSchema extends AnySchema,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  EffectType extends ResumableEffectKind = ResumableEffectKind,
> = ActionContext<State, Manifest> &
  RuntimeHelpers<State> &
  MutationRuntimeHelpers & {
    state: State;
    input: ContinuationInputForSource<DataSchema, EffectType>;
  };

export type ScopedPhaseState<
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  PhaseState extends object,
> = State & { phase: PhaseState };

// --- Continuation Callables ---

export type ContinuationCallable<
  DataSchema extends AnySchema,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  ContinuationId extends string = string,
  EffectType extends ResumableEffectKind = ResumableEffectKind,
> = ((
  data: z.infer<DataSchema>,
) => ContinuationToken<
  z.infer<DataSchema>,
  ContinuationId,
  EffectContinuationResponse<EffectType>
>) & {
  id: ContinuationId;
  source: "effect";
  dataSchema: DataSchema;
  responseSchema: AnySchema;
  effectKind?: EffectType;
  reduce: BivariantCallback<
    ContinuationReduceArgs<DataSchema, State, Manifest, EffectType>,
    ReducerResult<State>
  >;
};

export type AnyContinuationCallable<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
> = {
  (data: never): AnyContinuationToken;
  id: string;
  source: "effect";
  dataSchema: AnySchema;
  responseSchema: AnySchema;
  effectKind?: ResumableEffectKind;
  // Heterogeneously-typed erasure: the concrete args shape is determined by
  // `effectKind` and validated at runtime via `dataSchema` +
  // `responseSchema`. Consumers must cast at the call site.
  reduce: (args: unknown) => ReducerResult<State>;
};

export type EffectContinuationCallable<
  DataSchema extends AnySchema,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  ContinuationId extends string = string,
  Kind extends ResumableEffectKind = ResumableEffectKind,
> = ContinuationCallable<DataSchema, State, Manifest, ContinuationId, Kind>;

// --- Effect definitions (the single authoring factory for engine cues) ---
//
// Effects are resumable engine-side cues (e.g. rolling a die, shuffling a
// shared zone). They are authored with `defineEffect({ type, id, context?,
// reduce? })` and dispatched at runtime via `fx.effect(effect, options)`.
// Addressed player requests are NOT effects — they are authored as
// prompt-kind interactions via `defineInteraction({ kind: "prompt", ... })`.

/**
 * `rollDie` effect. Resolves a `rollDie` wire effect. `reduce` / `context`
 * are both optional so authors can fire-and-forget a die roll without
 * observing the result.
 */
export type EffectRollDieDefinition<
  Id extends string,
  ContextSchema extends AnySchema,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = {
  readonly type: "rollDie";
  readonly id: Id;
  readonly contextSchema?: ContextSchema;
  readonly __continuation?: EffectContinuationCallable<
    ContextSchema,
    State,
    Manifest,
    Id,
    "rollDie"
  >;
};

/**
 * `shuffleSharedZone` effect. Resolves a `shuffleSharedZone` wire effect.
 * `reduce` / `context` are both optional.
 */
export type EffectShuffleDefinition<
  Id extends string,
  ContextSchema extends AnySchema,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = {
  readonly type: "shuffleSharedZone";
  readonly id: Id;
  readonly contextSchema?: ContextSchema;
  readonly __continuation?: EffectContinuationCallable<
    ContextSchema,
    State,
    Manifest,
    Id,
    "shuffleSharedZone"
  >;
};

/**
 * `shufflePlayerZone` effect. Resolves a `shufflePlayerZone` wire effect for
 * a single player's perPlayer zone (e.g. deck-builder reshuffle of discard
 * into deck). `reduce` / `context` are both optional.
 */
export type EffectShufflePlayerZoneDefinition<
  Id extends string,
  ContextSchema extends AnySchema,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = {
  readonly type: "shufflePlayerZone";
  readonly id: Id;
  readonly contextSchema?: ContextSchema;
  readonly __continuation?: EffectContinuationCallable<
    ContextSchema,
    State,
    Manifest,
    Id,
    "shufflePlayerZone"
  >;
};

/**
 * Discriminated union of every `defineEffect` output.
 */
export type EffectDefinition<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> =
  | EffectRollDieDefinition<string, AnySchema, State, Manifest>
  | EffectShuffleDefinition<string, AnySchema, State, Manifest>
  | EffectShufflePlayerZoneDefinition<string, AnySchema, State, Manifest>;

export type EffectMap<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Record<string, EffectDefinition<State, Manifest>>;

export type EffectRegistryOfPhase<Phase> = Phase extends {
  effects?: infer Effects extends Record<string, unknown>;
}
  ? Effects
  : Record<string, never>;

// --- Phase & View Definitions ---

export type SimultaneousSubmission<
  Collectors extends Record<string, InputCollector>,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
> = {
  playerId: PlayerIdOfState<State>;
  params: ParamsOf<Collectors>;
};

export type SimultaneousResolveArgs<
  Collectors extends Record<string, InputCollector>,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> &
  RuntimeHelpers<State> &
  MutationRuntimeHelpers & {
    state: State;
    submissions: Record<
      PlayerIdOfState<State>,
      SimultaneousSubmission<Collectors, State>
    >;
    submittedPlayerIds: PlayerIdOfState<State>[];
    waitingPlayerIds: PlayerIdOfState<State>[];
  };

export type SimultaneousSubmitSpec<
  Collectors extends Record<string, InputCollector> = Record<
    string,
    InputCollector
  >,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  } = {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  },
  Manifest extends ManifestContract<TableOfState<State>> = ManifestContract<
    TableOfState<State>
  >,
> = Omit<InteractionSpec<Collectors, State, Manifest>, "reduce"> & {
  /**
   * Optional compatibility slot for callers that reuse `defineInteraction`.
   * The simultaneous phase barrier stores submissions and invokes the
   * phase-level `resolve`; this per-submission reducer is intentionally
   * ignored when present.
   */
  reduce?: InteractionSpec<Collectors, State, Manifest>["reduce"];
};

type PhaseDefinitionCommon<
  PhaseStateSchema extends SchemaLike<object>,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  Manifest extends ManifestContract<TableOfState<State>>,
> = {
  name?: string;
  state: PhaseStateSchema;
  initialState?: (ctx: {
    manifest: Manifest;
    state: State;
    playerIds: PlayerIdOfState<State>[];
    setup: SetupSelectionOfManifest<Manifest> | null;
  }) => z.infer<PhaseStateSchema>;
  enter?: BivariantCallback<
    PhaseEnterArgs<
      ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
      Manifest
    >,
    ReducerResult<ScopedPhaseState<State, z.infer<PhaseStateSchema>>> | void
  >;
};

export type AutoPhaseDefinition<
  PhaseStateSchema extends SchemaLike<object>,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  Manifest extends ManifestContract<TableOfState<State>>,
> = PhaseDefinitionCommon<PhaseStateSchema, State, Manifest> & {
  kind: "auto";
  actor?: never;
  actors?: never;
  submit?: never;
  canResubmit?: never;
  resolve?: never;
  effects?: never;
  interactions?: never;
  stages?: never;
  zones?: never;
  cardActions?: never;
};

export type PlayerPhaseDefinition<
  PhaseStateSchema extends SchemaLike<object>,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  Manifest extends ManifestContract<TableOfState<State>>,
  Effects extends EffectMap<State, Manifest> = Record<string, never>,
  Interactions extends InteractionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Stages extends StageMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Zones extends PhaseZoneList<Manifest> = readonly [],
  CardActions extends CardActionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
> = PhaseDefinitionCommon<PhaseStateSchema, State, Manifest> & {
  kind: "player";
  /**
   * Default actor selector for interactions in this phase. When omitted the
   * runtime falls back to `flow.activePlayers`, preserving the existing turn
   * ownership model. Returning multiple players models simultaneous actors.
   */
  actor?: ActorSelector<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  >;
  actors?: never;
  submit?: never;
  canResubmit?: never;
  resolve?: never;
  effects?: Effects;
  interactions?: Interactions;
  stages?: Stages;
  zones?: Zones;
  cardActions?: CardActions;
};

export type SimultaneousPlayerPhaseDefinition<
  PhaseStateSchema extends SchemaLike<object>,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  Manifest extends ManifestContract<TableOfState<State>>,
  SubmitCollectors extends Record<string, InputCollector> = Record<
    string,
    InputCollector
  >,
  Effects extends EffectMap<State, Manifest> = Record<string, never>,
  Interactions extends InteractionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Stages extends StageMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Zones extends PhaseZoneList<Manifest> = readonly [],
  CardActions extends CardActionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
> = PhaseDefinitionCommon<PhaseStateSchema, State, Manifest> & {
  kind: "simultaneousPlayer";
  actor?: never;
  /**
   * Actor selector for `kind: "simultaneousPlayer"` phases. This is an alias
   * of `actor` with wording that matches simultaneous submission semantics.
   */
  actors: ActorSelector<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  >;
  /**
   * Canonical sealed submission interaction for simultaneous phases. It is
   * projected like a normal interaction, but the trusted runtime stores the
   * parsed params until every actor has submitted, then calls `resolve`.
   */
  submit: SimultaneousSubmitSpec<
    SubmitCollectors,
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  >;
  /**
   * When false or omitted, each actor can submit once per simultaneous
   * barrier. Set true to allow replacing the sealed submission before every
   * required actor has submitted.
   */
  canResubmit?: boolean;
  /**
   * Batch resolver invoked once all simultaneous actors have submitted. The
   * submitted params are passed together so game state mutates from one
   * deterministic base state instead of one player at a time.
   */
  resolve: BivariantCallback<
    SimultaneousResolveArgs<
      SubmitCollectors,
      ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
      Manifest
    >,
    ReducerResult<ScopedPhaseState<State, z.infer<PhaseStateSchema>>>
  >;
  effects?: Effects;
  interactions?: Interactions;
  stages?: Stages;
  zones?: Zones;
  cardActions?: CardActions;
};

export type PhaseDefinition<
  PhaseStateSchema extends SchemaLike<object>,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  Manifest extends ManifestContract<TableOfState<State>>,
  SubmitCollectors extends Record<string, InputCollector> = Record<
    string,
    InputCollector
  >,
  Effects extends EffectMap<State, Manifest> = Record<string, never>,
  Interactions extends InteractionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Stages extends StageMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
  Zones extends PhaseZoneList<Manifest> = readonly [],
  CardActions extends CardActionMap<
    ScopedPhaseState<State, z.infer<PhaseStateSchema>>,
    Manifest
  > = Record<string, never>,
> =
  | AutoPhaseDefinition<PhaseStateSchema, State, Manifest>
  | PlayerPhaseDefinition<
      PhaseStateSchema,
      State,
      Manifest,
      Effects,
      Interactions,
      Stages,
      Zones,
      CardActions
    >
  | SimultaneousPlayerPhaseDefinition<
      PhaseStateSchema,
      State,
      Manifest,
      SubmitCollectors,
      Effects,
      Interactions,
      Stages,
      Zones,
      CardActions
    >;

export type ViewDefinition<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  Projection = unknown,
> = {
  project: (
    args: ActionContext<State, Manifest> &
      RuntimeHelpers<State> & {
        state: State;
        playerId: PlayerIdOfState<State>;
        runtime: State extends {
          runtime: infer RuntimeStateValue;
        }
          ? RuntimeStateValue
          : never;
      },
  ) => Projection;
};

/**
 * Session-scoped, once-per-init view. The `project` callback receives only
 * the authored manifest — the mutable-state helpers (`state`, `playerId`,
 * `runtime`, `fx`, `ops`, `accept`, `reject`, `q`) that `ViewDefinition.project`
 * exposes are structurally absent, so an author cannot accidentally project
 * per-tick state into the payload. The host calls this once per reducer
 * session, caches the result, and merges it back into every seat view on
 * the client. Moving static board topology here is what lets the adapter
 * skip the ~87% of `projectSeatsDynamic` wall time that used to re-serialize
 * manifest-sourced fields on every input.
 */
export type StaticViewDefinition<
  Manifest extends ManifestContract<RuntimeTableRecord>,
  Projection = unknown,
> = {
  project: (args: {
    manifest: Manifest;
    q: StaticViewQueries<Manifest>;
  }) => Projection;
};

// --- Interaction / Stage / Zone primitives ---
//
// The new authoring surface. A `PhaseDefinition` can declare:
//   - `interactions`: the set of authoring-level interactions routed by id.
//     Each `InteractionSpec` has typed input collectors and a `reduce` that
//     receives `params: ParamsOf<Collectors>`.
//   - `stages`: first-match-wins sub-phase selectors with `allow` gating.
//   - `zones`: manifest player card zones projected as behavior descriptors.

export type InputCollectorKind =
  | "form"
  | "board-vertex"
  | "board-edge"
  | "board-tile"
  | "board-space"
  | "card"
  | "prompt"
  | "rng";

export type TargetKind = "edge" | "vertex" | "space" | "tile" | "card";
export type BoardInputCollectorKind = Exclude<
  InputCollectorKind,
  "form" | "card" | "prompt" | "rng"
>;

export type CardInputCollectorMeta = {
  readonly zoneId: string;
  readonly zoneIds?: readonly string[];
  readonly targetKind: "card";
};

export type BoardInputCollectorMeta = {
  readonly targetKind: TargetKind;
  readonly boardId: string;
  readonly valueKind?: "board-id" | "player-board-space";
};

export type PromptInputCollectorMeta = {
  readonly options: (
    state: unknown,
    playerId: unknown,
    q: unknown,
  ) => ReadonlyArray<{ id: unknown; label?: string }>;
  readonly eligibleOptions: (
    state: unknown,
    playerId: unknown,
    q: unknown,
  ) => ReadonlyArray<{ id: unknown; label?: string }>;
};

export type RngInputCollectorMeta =
  | { readonly rng: "d6"; readonly count: number }
  | { readonly rng: "coin" };

export type InputCollectorMetaForKind<Kind extends InputCollectorKind> =
  Kind extends "card"
    ? CardInputCollectorMeta
    : Kind extends BoardInputCollectorKind
      ? BoardInputCollectorMeta
      : Kind extends "prompt"
        ? PromptInputCollectorMeta | undefined
        : Kind extends "rng"
          ? RngInputCollectorMeta
          : never;

export type InputSelectionDescriptor =
  | { readonly mode: "single" }
  | {
      readonly mode: "many";
      readonly min: number;
      readonly max?: number;
      readonly distinct?: boolean;
    };

export type InputDomainResolverDescriptor = {
  readonly interactionKey?: string;
  readonly inputKey: string;
};

export type InputDomainDependencyCase<
  Domain extends InputDomainDescriptor = InputDomainDescriptor,
> = {
  when: Record<string, string>;
  domain: Domain;
};

export type EagerInputDomainDependencies<
  Domain extends InputDomainDescriptor = InputDomainDescriptor,
> = {
  readonly mode: "eager";
  readonly dependentCases: readonly InputDomainDependencyCase<Domain>[];
};

export type LazyInputDomainDependencies = {
  readonly mode: "lazy";
  readonly dependsOn: readonly string[];
  readonly resolver: InputDomainResolverDescriptor;
};

export type CardTargetDomainDescriptor =
  | ResolvedCardTargetDomainDescriptor
  | LazyCardTargetDomainDescriptor;

export type ResolvedCardTargetDomainDescriptor = {
  readonly type: "cardTarget";
  readonly projection: "resolved";
  readonly targetKind: "card";
  readonly zoneIds: readonly string[];
  readonly eligibleTargets: readonly string[];
  readonly selection?: InputSelectionDescriptor;
  readonly dependencies?: EagerInputDomainDependencies<ResolvedCardTargetDomainDescriptor>;
};

export type LazyCardTargetDomainDescriptor = {
  readonly type: "cardTarget";
  readonly projection: "lazy";
  readonly targetKind: "card";
  readonly zoneIds: readonly string[];
  readonly eligibleTargets?: never;
  readonly selection?: InputSelectionDescriptor;
  readonly dependencies: LazyInputDomainDependencies;
};

export type BoardTargetDomainDescriptor =
  | ResolvedBoardTargetDomainDescriptor
  | LazyBoardTargetDomainDescriptor;

export type ResolvedBoardTargetDomainDescriptor = {
  readonly type: "boardTarget";
  readonly projection: "resolved";
  readonly targetKind: Exclude<TargetKind, "card">;
  readonly boardId: string;
  readonly valueKind?: "board-id" | "player-board-space";
  readonly eligibleTargets: readonly string[];
  readonly selection?: InputSelectionDescriptor;
  readonly dependencies?: EagerInputDomainDependencies<ResolvedBoardTargetDomainDescriptor>;
};

export type LazyBoardTargetDomainDescriptor = {
  readonly type: "boardTarget";
  readonly projection: "lazy";
  readonly targetKind: Exclude<TargetKind, "card">;
  readonly boardId: string;
  readonly valueKind?: "board-id" | "player-board-space";
  readonly eligibleTargets?: never;
  readonly selection?: InputSelectionDescriptor;
  readonly dependencies: LazyInputDomainDependencies;
};

export type ResourceMapDomainDescriptor = {
  type: "resourceMap";
  resources: Array<{
    resourceId: string;
    label?: string;
    icon?: string;
    min: number;
    max: number;
  }>;
  selection?: InputSelectionDescriptor;
};

export type BoundedNumberDomainDescriptor = {
  type: "boundedNumber";
  min: number;
  max: number;
  step?: number;
  selection?: InputSelectionDescriptor;
};

export type ChoiceDomainDescriptor = {
  type: "choice";
  choices: Array<{
    value: string | null;
    label: string;
    icon?: string;
    badge?: string;
    description?: string;
    disabled?: boolean;
    disabledReason?: string;
  }>;
  selection?: InputSelectionDescriptor;
  dependencies?: EagerInputDomainDependencies<ChoiceDomainDescriptor>;
};

export type ChoiceListDomainDescriptor = {
  type: "choiceList";
  choices: Array<{
    value: string;
    label: string;
    icon?: string;
    badge?: string;
    description?: string;
    disabled?: boolean;
    disabledReason?: string;
  }>;
  min?: number;
  max?: number;
  selection?: InputSelectionDescriptor;
  dependencies?: EagerInputDomainDependencies<ChoiceListDomainDescriptor>;
};

export type InputDomainDescriptor =
  | CardTargetDomainDescriptor
  | BoardTargetDomainDescriptor
  | ResourceMapDomainDescriptor
  | BoundedNumberDomainDescriptor
  | ChoiceDomainDescriptor
  | ChoiceListDomainDescriptor;

type DomainProjector<Domain extends InputDomainDescriptor> = (
  state: CollectorState,
  playerId: string,
  q: unknown,
  derived: DerivedResolver,
  values?: Readonly<Record<string, unknown>>,
) => Domain;

type InputDomainForCollectorKind<Kind extends InputCollectorKind> =
  Kind extends "card"
    ? CardTargetDomainDescriptor
    : Kind extends BoardInputCollectorKind
      ? BoardTargetDomainDescriptor
      : Exclude<
          InputDomainDescriptor,
          CardTargetDomainDescriptor | BoardTargetDomainDescriptor
        >;

/**
 * Base state shape every collector is generic over. Collectors that need
 * narrowed ids (card / player) use `PlayerIdOfState<State>` etc. to thread
 * the manifest's branded types.
 */
export type CollectorState = {
  table: RuntimeTableRecord;
  flow: { currentPhase: string };
};

/**
 * An input collector declares:
 *   - a Zod schema for the parameter value the interaction expects. The
 *     schema's `z.infer` feeds `ParamsOf<Collectors>`, so downstream
 *     `reduce({ input: { params } })` sees branded ids from `cardInput` /
 *     `boardInput` without a second declaration.
 *   - an optional `eligibleTargets(state, playerId, q)` hook that the runtime
 *     calls to enumerate server-authoritative valid values. The hook receives
 *     the same `q` table-queries helper that `validate` / `reduce` see, so
 *     board/card/prompt collectors can reuse whatever board-graph or zone
 *     lookups they already use for validation without rebuilding them from
 *     raw state. Each collector helper narrows the return type to its own
 *     branded id (`CardIdOfState<State>` for `cardInput`, the caller-supplied
 *     `Id extends string` for `boardInput.*`, etc.). At the generic interface
 *     level we keep inputs weak (`CollectorState`, `string`, `unknown`) and
 *     the return `ReadonlyArray<unknown>` so the runtime can treat all
 *     collectors uniformly; per-helper signatures provide the author-facing
 *     strong typing.
 *   - optional `meta` for collector-kind-specific routing (e.g. `cardInput`
 *     stores the `zoneId` the card must come from).
 *
 * Collectors without meaningful eligibility (`form`, `rng`) leave
 * `eligibleTargets` undefined.
 */
type InputCollectorMetaSlot<Kind extends InputCollectorKind> = [
  InputCollectorMetaForKind<Kind>,
] extends [never]
  ? { readonly meta?: never }
  : undefined extends InputCollectorMetaForKind<Kind>
    ? {
        readonly meta?: Exclude<InputCollectorMetaForKind<Kind>, undefined>;
      }
    : { readonly meta: InputCollectorMetaForKind<Kind> };

type InputCollectorBase<
  Schema extends SchemaLike<unknown> = SchemaLike<unknown>,
  // `State` is retained as a generic slot so factory helpers (`cardInput`,
  // `boardInput`, etc.) can advertise branded ids in their return type, but
  // the interface intentionally does *not* thread `State` into
  // `eligibleTargets`'s function parameters. Doing so introduced
  // contravariance that blocked passing a game-specific collector (e.g.
  // `InputCollector<_, GameState>`) where the interaction spec expected
  // `InputCollector<_, CollectorState>`. Strong typing lives at the factory
  // boundary; the interface itself keeps the runtime-visible hook generic.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  State extends CollectorState = CollectorState,
  Kind extends InputCollectorKind = InputCollectorKind,
> = {
  readonly kind: Kind;
  readonly schema: Schema;
  readonly defaultValue?: z.infer<Schema>;
  readonly selection?: InputSelectionDescriptor;
  readonly eligibleTargets?: (
    state: CollectorState,
    playerId: string,
    q: unknown,
    values?: Readonly<Record<string, unknown>>,
  ) => ReadonlyArray<unknown>;
  readonly validateTarget?: (
    state: CollectorState,
    playerId: string,
    q: unknown,
    targetId: unknown,
    values?: Readonly<Record<string, unknown>>,
  ) => ValidationIssue | null | undefined;
  readonly dependsOn?: readonly string[];
  readonly resolveDefaultValue?: (
    state: CollectorState,
    playerId: string,
    q: unknown,
    derived: DerivedResolver,
    domain: InputDomainDescriptor,
  ) => z.infer<Schema> | undefined;
} & (Kind extends "rng"
  ? { readonly domain?: never }
  : Kind extends "card" | BoardInputCollectorKind
    ? { readonly domain: DomainProjector<InputDomainForCollectorKind<Kind>> }
    : {
        readonly domain?: DomainProjector<InputDomainForCollectorKind<Kind>>;
      }) &
  InputCollectorMetaSlot<Kind>;

export type InputCollector<
  Schema extends SchemaLike<unknown> = SchemaLike<unknown>,
  State extends CollectorState = CollectorState,
  Kind extends InputCollectorKind = InputCollectorKind,
> = Kind extends InputCollectorKind
  ? InputCollectorBase<Schema, State, Kind>
  : never;

// Infer the typed params bag from an input-collector map.
//
// Each collector contributes `{ [key]: z.infer<schema> }`. The result is the
// typed shape handed to `reduce({ input: { params } })`.
export type ParamsOf<Collectors extends Record<string, InputCollector>> = {
  [K in keyof Collectors]: Collectors[K] extends InputCollector<infer S>
    ? S extends SchemaLike<infer V>
      ? V
      : never
    : never;
};

// Keys of `Collectors` whose values are engine-sampled (currently only
// `rngInput.*` — `kind: "rng"`). Clients never submit these fields; the
// trusted reducer bundle samples them during `submitInteraction`.
type EngineSampledCollectorKeys<
  Collectors extends Record<string, InputCollector>,
> = {
  [K in keyof Collectors]: Collectors[K] extends InputCollector & {
    kind: "rng";
  }
    ? K
    : never;
}[keyof Collectors];

// Infer the client-facing params bag: identical to `ParamsOf<Collectors>`
// except engine-sampled collectors (`rngInput.*`) are omitted. This is the
// shape clients pass to `submitInteraction` / `handle.submit` — the bundle
// fills the engine-sampled fields before handing the merged record to
// `reduce`.
export type ClientParamsOf<Collectors extends Record<string, InputCollector>> =
  {
    [K in keyof Collectors as K extends EngineSampledCollectorKeys<Collectors>
      ? never
      : K]: Collectors[K] extends InputCollector<infer S>
      ? S extends SchemaLike<infer V>
        ? V
        : never
      : never;
  };

export type InteractionReduceInput<
  Collectors extends Record<string, InputCollector>,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
> = {
  playerId: PlayerIdOfState<State>;
  params: ParamsOf<Collectors>;
};

export type InteractionValidateArgs<
  Collectors extends Record<string, InputCollector>,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> &
  RuntimeHelpers<State> & {
    state: State;
    input: InteractionReduceInput<Collectors, State>;
  };

export type InteractionReduceArgs<
  Collectors extends Record<string, InputCollector>,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = InteractionValidateArgs<Collectors, State, Manifest> &
  MutationRuntimeHelpers;

export type InteractionAvailabilityArgs<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> &
  RuntimeHelpers<State> & {
    state: State;
    input: { playerId: PlayerIdOfState<State> };
  };

export type InteractionRuleValidationResult =
  | boolean
  | ValidationIssue
  | null
  | undefined;

export type InteractionRule<
  Collectors extends Record<string, InputCollector> = Record<
    string,
    InputCollector
  >,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  } = {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  },
  Manifest extends ManifestContract<TableOfState<State>> = ManifestContract<
    TableOfState<State>
  >,
> = {
  /**
   * Stable rule id for diagnostics and tests. Rule ids are author-owned and
   * should be unique within one interaction.
   */
  id: string;
  /**
   * Error code used when the rule fails. The same code is used for descriptor
   * availability and submit-time validation unless `validate` returns a
   * specific ValidationIssue.
   */
  errorCode: string;
  message?: string;
  /**
   * Projection-time rule. Runs without submitted params, so UI descriptors can
   * reflect action availability before the user clicks.
   */
  available?: BivariantCallback<
    InteractionAvailabilityArgs<State, Manifest>,
    boolean
  >;
  /**
   * Submit-time rule. Runs with parsed params and may return false, a concrete
   * ValidationIssue, null, or undefined.
   */
  validate?: BivariantCallback<
    InteractionValidateArgs<Collectors, State, Manifest>,
    InteractionRuleValidationResult
  >;
};

export type InteractionCommitPolicy =
  | { mode: "manual" }
  | { mode: "autoWhenReady" };

type HasManyInputCollector<Collectors extends Record<string, InputCollector>> =
  Extract<
    Collectors[keyof Collectors],
    { readonly selection: { readonly mode: "many" } }
  > extends never
    ? false
    : true;

type InteractionCommitPolicyFor<
  Collectors extends Record<string, InputCollector>,
> =
  HasManyInputCollector<Collectors> extends true
    ? { mode: "manual" }
    : InteractionCommitPolicy;

/**
 * Projection-level interaction kind, derived by the trusted bundle from
 * collector shape:
 *
 * - `"action"`: any interaction whose inputs are ordinary collectors
 *   (`formInput`, `cardInput`).
 * - `"prompt"`: any interaction whose inputs include a `promptInput`
 *   collector. Prompt descriptors carry addressed-player context and options
 *   so UI primitives can render response controls without reducer-owned
 *   placement metadata.
 *
 * Authors never set this directly — the `promptInput(...)` collector is
 * the single source of truth for prompt semantics. See {@link promptInput}
 * and {@link InteractionDescriptor.kind}.
 */
export type InteractionKind = "action" | "prompt";

export type InteractionToArgs<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> & {
  state: State;
};

export type InteractionSpec<
  Collectors extends Record<string, InputCollector> = Record<
    string,
    InputCollector
  >,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  } = {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  },
  Manifest extends ManifestContract<TableOfState<State>> = ManifestContract<
    TableOfState<State>
  >,
> = {
  inputs: Collectors;
  paramsSchema?: SchemaLike<ClientParamsOf<Collectors>>;
  /** @internal Phase-local step gates are attached by `defineStepPhase`. */
  __steps?: readonly string[];
  /**
   * Draft commit policy. The input collectors still own value shape and
   * validation; this only controls whether a ready draft may be submitted
   * automatically by SDK controls.
   *
   * Multi-value collectors created with `many(...)` are always manual draft
   * interactions. They represent a selection set that should be committed by
   * explicit player intent, so `autoWhenReady` is intentionally not accepted.
   */
  commit?: InteractionCommitPolicyFor<Collectors>;
  /**
   * Addressed-player selector, used by prompt-kind interactions. When
   * present, the trusted bundle only emits this descriptor for players in
   * the returned set (or the single player, if a scalar is returned). Use
   * to thread e.g. `state.publicState.knowerPlayerId` through without
   * having to manage `activePlayers`. `undefined` / empty returns fall back
   * to the standard `activePlayers` gating used by action-kind interactions.
   */
  to?: BivariantCallback<
    InteractionToArgs<State, Manifest>,
    | PlayerIdOfState<State>
    | ReadonlyArray<PlayerIdOfState<State>>
    | null
    | undefined
  >;
  /**
   * Explicit actor selector. Overrides the phase-level actor for this
   * interaction. Prefer this over `to` for new non-prompt interactions; `to`
   * remains the prompt/addressee shorthand.
   */
  actor?: ActorSelector<State, Manifest>;
  /**
   * Descriptor visibility policy. `all` keeps non-actors visible but disabled;
   * `actorsOnly` suppresses descriptors for seats that cannot act.
   */
  visibility?: "all" | "actorsOnly";
  errorCodes?: readonly string[];
  cost?: BivariantCallback<
    InteractionValidateArgs<Collectors, State, Manifest>,
    Readonly<Record<string, number>>
  >;
  rules?: readonly InteractionRule<NoInfer<Collectors>, State, Manifest>[];
  reduce: BivariantCallback<
    InteractionReduceArgs<Collectors, State, Manifest>,
    ReducerResult<State>
  >;
};

export type CardActionSpec<
  Collectors extends Record<string, InputCollector> = Record<
    string,
    InputCollector
  >,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  } = {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  },
  Manifest extends ManifestContract<TableOfState<State>> = ManifestContract<
    TableOfState<State>
  >,
  PlayFrom extends PlayerZoneIdOfManifest<Manifest> =
    PlayerZoneIdOfManifest<Manifest>,
> = {
  cardType: CardTypeOfState<State>;
  playFrom: PlayFrom;
  inputs?: Collectors;
  paramsSchema?: SchemaLike<Record<string, unknown>>;
  /** @internal Phase-local step gates are attached by `defineStepPhase`. */
  __steps?: readonly string[];
  /**
   * Draft commit policy. Card clicks still mutate the draft first;
   * `autoWhenReady` submits only once the full interaction draft validates.
   * Multi-value collectors created with `many(...)` are always manual draft
   * interactions and cannot opt into `autoWhenReady`.
   */
  commit?: InteractionCommitPolicyFor<Collectors>;
  actor?: ActorSelector<State, Manifest>;
  visibility?: "all" | "actorsOnly";
  errorCodes?: readonly string[];
  cost?: BivariantCallback<
    InteractionValidateArgs<
      Collectors & { cardId: InputCollector<SchemaLike<CardIdOfState<State>>> },
      State,
      Manifest
    >,
    Readonly<Record<string, number>>
  >;
  rules?: readonly InteractionRule<
    NoInfer<
      Collectors & {
        cardId: InputCollector<SchemaLike<CardIdOfState<State>>>;
      }
    >,
    State,
    Manifest
  >[];
  reduce: BivariantCallback<
    InteractionReduceArgs<
      Collectors & { cardId: InputCollector<SchemaLike<CardIdOfState<State>>> },
      State,
      Manifest
    >,
    ReducerResult<State>
  >;
};

export type AnyCardActionSpec<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = CardActionSpec<Record<string, InputCollector>, State, Manifest>;

export type CardActionMap<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Record<string, AnyCardActionSpec<State, Manifest>>;

/**
 * Type-safe erasure of {@link InteractionSpec} used by the runtime when it
 * stores heterogeneous interactions in a single map. The collectors generic
 * is erased to the structural upper bound (`Record<string, InputCollector>`)
 * so that lookups and metadata helpers can iterate collectors without
 * committing to a specific authoring-time shape.
 */
export type AnyInteractionSpec<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = InteractionSpec<Record<string, InputCollector>, State, Manifest>;

export type InteractionMap<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Record<string, AnyInteractionSpec<State, Manifest>>;

export type StageSpec<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = {
  when?: BivariantCallback<
    ActionContext<State, Manifest> & { state: State },
    boolean
  >;
  onEnter?: BivariantCallback<
    PhaseEnterArgs<State, Manifest>,
    ReducerResult<State> | void
  >;
  onExit?: BivariantCallback<
    PhaseEnterArgs<State, Manifest>,
    ReducerResult<State> | void
  >;
  allow: readonly string[];
};

export type StageMap<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Record<string, StageSpec<State, Manifest>>;

export type PhaseZoneList<
  Manifest extends ManifestContract<RuntimeTableRecord>,
> = readonly PlayerZoneIdOfManifest<Manifest>[];
