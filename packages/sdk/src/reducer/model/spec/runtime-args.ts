import type { RuntimeTableRecord, StringKeyOf } from "../table";
import type { ManifestContract } from "../manifest";
import type {
  PhaseNameOfState,
  PlayerIdOfState,
  TableOfState,
  SetupSelectionOfManifest,
} from "../extract";
import type { ReducerRuntimeStateForState } from "../runtime";
import type { TableQueriesOfState } from "../queries";
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

/**
 * Read-only helpers available to every callback, including views, actor
 * selectors, and interaction rules.
 */
export type ReadHelpers<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
> = {
  q: TableQueriesOfState<State>;
  derived: DerivedResolver;
};

export type RandomHelpers = {
  integer(options: { minInclusive: number; maxInclusive: number }): number;
  subset<const Values extends readonly unknown[]>(options: {
    from: Values;
    count: number;
  }): readonly Values[number][];
};

/**
 * Helpers available only to mutation callbacks (`enter`, `reduce`, `resolve`). `tx` is the open transaction: mutate through it and end the
 * callback with a bare `return`, `tx.transition(...)`, `tx.endGame(...)`, or
 * `tx.reject(...)`.
 */
export type MutationHelpers<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  ErrorCode extends string = string,
> = {
  tx: ReducerTransaction<State, ErrorCode>;
  random: RandomHelpers;
};

export type PhaseEnterArgs<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  ErrorCode extends string = string,
> = ActionContext<State, Manifest> &
  ReadHelpers<State> &
  MutationHelpers<State, ErrorCode> &
  PhaseEnterContext & {
    state: State;
  };

export type ActorSelectorArgs<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> &
  ReadHelpers<State> & {
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

export type ScopedPhaseState<
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
    phase: object;
  },
  PhaseState extends object,
> = State & { phase: PhaseState };
