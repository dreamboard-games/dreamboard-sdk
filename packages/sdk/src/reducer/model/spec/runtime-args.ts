import type { z } from "zod";
import type { AnySchema, RuntimeTableRecord, StringKeyOf } from "../table";
import type { ManifestContract } from "../manifest";
import type {
  PhaseNameOfState,
  PlayerIdOfState,
  TableOfState,
  SetupSelectionOfManifest,
} from "../extract";
import type {
  AnyContinuationToken,
  ContinuationToken,
  ReducerAccept,
  ReducerAcceptOptions,
  ReducerFx,
  ReducerReject,
  ReducerResult,
  ReducerRuntimeStateForState,
  GameOutcome,
} from "../runtime";
import type { TableQueriesOfState } from "../queries";
import type { ReducerOps } from "../../ops";
import type { ReducerTransaction } from "../../transaction";
import type { DerivedResolver } from "../../derived";

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

export type BivariantCallback<Args, Result> = {
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

export type ValidationIssue<ErrorCode extends string = string> = {
  errorCode: ErrorCode;
  message?: string;
};

export type RuntimeHelpers<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  ErrorCode extends string = string,
> = {
  accept(
    state: State,
    options?: ReducerAcceptOptions<State>,
  ): ReducerAccept<State>;
  endGame(
    state: State,
    outcome: GameOutcome<PlayerIdOfState<State>>,
    options?: ReducerAcceptOptions<State>,
  ): ReducerAccept<State>;
  reject: (errorCode: ErrorCode, message?: string) => ReducerReject;
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
