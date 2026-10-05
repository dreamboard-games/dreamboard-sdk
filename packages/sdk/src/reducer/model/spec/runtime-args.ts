import type { ZoneDefinitions } from "../table.js";
import type { TopologyDefinitions } from "../../../shared/domain/topology-definitions.js";
import type { RuntimeTableRecord } from "../table";
import type { ManifestContract } from "../manifest";
import type {
  PhaseNameOfState,
  PlayerIdOfState,
  TableOfState,
} from "../extract";
import type { ReducerRuntimeStateForState } from "../runtime";
import type { TableQueriesOfState } from "../queries";
import type { ReducerTransaction } from "../../transaction";

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
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  q: TableQueriesOfState<State, Definitions>;
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
  Definitions extends ZoneDefinitions = ZoneDefinitions,
> = {
  tx: ReducerTransaction<State, ErrorCode, Definitions>;
  random: RandomHelpers;
};

export type PhaseEnterArgs<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
  ErrorCode extends string = string,
> = ActionContext<State, Manifest> &
  ReadHelpers<State, Manifest> &
  MutationHelpers<State, ErrorCode, Manifest> &
  PhaseEnterContext & {
    state: State;
  };

export type ActorSelectorArgs<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> &
  ReadHelpers<State, Manifest> & {
    state: State;
  };

export type ActorSelection<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
> =
  PlayerIdOfState<State> | readonly PlayerIdOfState<State>[] | null | undefined;

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
