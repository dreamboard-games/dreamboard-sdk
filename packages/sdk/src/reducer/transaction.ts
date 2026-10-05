import type {
  GameEvent,
  GameOutcome,
  PhaseNameOfState,
  PlayerIdOfState,
  ReducerAccept,
  ReducerReject,
  RuntimeTableRecord,
  TableQueriesOfState,
} from "./model";
import {
  transactionMutations,
  type TransactionMutations,
} from "./transaction-mutations";
import type { TableOfState, StringKeyOf } from "./model";
import { resolveZone, type ZoneInput } from "./table/zones";
import type { ZoneDefinitions, ZoneArg } from "./model";

export type TransactionRandom = {
  roll(sides: number): number;
  shuffle<Value>(
    values: readonly Value[],
    operation: "shuffleSharedZone" | "shufflePlayerZone",
  ): Value[];
};
import { createStateQueries } from "./table-queries";

type IsAny<Value> = 0 extends 1 & Value ? true : false;

/** Phase names a transaction may transition to; `string` when state is erased. */
type TransitionTarget<State> =
  IsAny<State> extends true ? string : PhaseNameOfState<State>;
import { cloneRuntimeTable } from "./table/clone";

export type { RotateZoneArgs } from "./transaction-mutations";

/**
 * Result builders on the transaction. A mutation callback ends with one of
 * these or with a bare `return` (accept the transaction as it stands).
 */
export type ReducerTransactionOutcome<
  State extends { table: RuntimeTableRecord },
  ErrorCode extends string = string,
> = {
  /** Emit public display events for every seat. Private details belong in the authored seat view. */
  emit(...events: GameEvent[]): void;
  /** Accept with the current transaction state. Same as a bare `return`. */
  accept(): ReducerAccept<State>;
  /** Accept and move the flow to another declared phase. */
  transition<To extends TransitionTarget<State>>(to: To): ReducerAccept<State>;
  /**
   * Accept and end the game with a terminal outcome. Pass `transition` to
   * also move the flow to a terminal phase in the same result.
   */
  endGame(
    outcome: GameOutcome<PlayerIdOfState<State>>,
    options?: { transition?: TransitionTarget<State> },
  ): ReducerAccept<State>;
  /** Reject with a declared error code. The transaction is discarded. */
  reject(errorCode: ErrorCode, message?: string): ReducerReject;
};

export type ReducerTransaction<
  State extends { table: RuntimeTableRecord },
  ErrorCode extends string = string,
> = TransactionMutations<State> &
  ReducerTransactionOutcome<State, ErrorCode> & {
    readonly state: State;
    readonly q: TableQueriesOfState<State>;
    roll(dieId: StringKeyOf<TableOfState<State>["dice"]>): number;
    shuffle(args: { zone: ZoneArg<TableOfState<State>> }): void;
  };

export type ReducerEdit<State extends { table: RuntimeTableRecord }> = <
  DraftState extends State,
>(
  state: DraftState,
  random: TransactionRandom,
) => ReducerTransaction<DraftState>;

const transactionContext = Symbol("dreamboard.reducerTransactionContext");

type TransactionContext<State extends { table: RuntimeTableRecord }> = {
  currentState: State;
  currentQueries: TableQueriesOfState<State> | null;
  methodCache: Record<string, (...args: readonly unknown[]) => State>;
  events: GameEvent[];
  random: TransactionRandom;
  definitions: ZoneDefinitions;
  rollMethod?: (dieId: string) => number;
  shuffleMethod?: (args: { zone: ZoneInput }) => void;
  outcome?: ReducerTransactionOutcome<State>;
};

function createOutcomeMethods<State extends { table: RuntimeTableRecord }>(
  context: TransactionContext<State>,
): ReducerTransactionOutcome<State> {
  const accept = (): ReducerAccept<State> => ({
    type: "accept",
    state: context.currentState,
    events: [...context.events],
  });
  return {
    emit(...events) {
      context.events.push(...events);
    },
    accept,
    transition(to) {
      return { ...accept(), transition: to as PhaseNameOfState<State> };
    },
    endGame(outcome, options) {
      return {
        ...accept(),
        terminal: outcome,
        ...(options?.transition
          ? { transition: options.transition as PhaseNameOfState<State> }
          : {}),
      };
    },
    reject(errorCode, message) {
      return { type: "reject", errorCode, message };
    },
  };
}

type TransactionHost<State extends { table: RuntimeTableRecord }> = {
  [transactionContext]: TransactionContext<State>;
};

function getTransactionContext<State extends { table: RuntimeTableRecord }>(
  host: unknown,
): TransactionContext<State> {
  const context = (host as Partial<TransactionHost<State>>)[transactionContext];
  if (!context) {
    throw new TypeError("Reducer transaction method called without a receiver");
  }
  return context;
}

function invalidate<State extends { table: RuntimeTableRecord }>(
  context: TransactionContext<State>,
): void {
  context.currentQueries = null;
}

function runInternal<State extends { table: RuntimeTableRecord }>(
  context: TransactionContext<State>,
  key: keyof TransactionMutations<State>,
  args: readonly unknown[],
): State {
  // eslint-disable-next-line no-restricted-syntax -- The transaction surface forwards each typed method to the identically keyed mutation with the same State and arguments, followed by the explicit compiled definition context.
  const mutate = transactionMutations[key] as unknown as (
    state: State,
    ...args: readonly unknown[]
  ) => State;
  mutate(context.currentState, ...args, context.definitions);
  invalidate(context);
  return context.currentState;
}

function createReducerTransactionSurface<
  State extends { table: RuntimeTableRecord },
>() {
  const surface = {};
  const descriptors: PropertyDescriptorMap = {
    state: {
      enumerable: true,
      get(this: unknown) {
        return getTransactionContext<State>(this).currentState;
      },
    },
    q: {
      enumerable: true,
      get(this: unknown) {
        const context = getTransactionContext<State>(this);
        context.currentQueries ??= createStateQueries(
          context.currentState,
          context.definitions,
        );
        return context.currentQueries;
      },
    },
  };

  for (const key of [
    "emit",
    "accept",
    "transition",
    "endGame",
    "reject",
  ] as const) {
    descriptors[key] = {
      enumerable: true,
      get(this: unknown) {
        const context = getTransactionContext<State>(this);
        context.outcome ??= createOutcomeMethods(context);
        return context.outcome[key];
      },
    };
  }

  for (const key of Object.keys(transactionMutations) as Array<
    keyof TransactionMutations<State>
  >) {
    descriptors[String(key)] = {
      enumerable: true,
      get(this: unknown) {
        const context = getTransactionContext<State>(this);
        const cacheKey = String(key);
        context.methodCache[cacheKey] ??= (...args: readonly unknown[]) =>
          runInternal(context, key, args);
        return context.methodCache[cacheKey];
      },
    };
  }

  descriptors.roll = {
    enumerable: true,
    get(this: unknown) {
      const context = getTransactionContext<State>(this);
      return (context.rollMethod ??= (dieId: string) => {
        const die = context.currentState.table.dice[dieId];
        if (!die) throw new Error(`Cannot roll unknown die '${dieId}'.`);
        const value = context.random.roll(die.sides);
        context.currentState.table.dice[dieId] = { ...die, value };
        invalidate(context);
        return value;
      });
    },
  };
  descriptors.shuffle = {
    enumerable: true,
    get(this: unknown) {
      const context = getTransactionContext<State>(this);
      return (context.shuffleMethod ??= (args: { zone: ZoneInput }) => {
        const table = context.currentState.table;
        const { ids, definition } = resolveZone(
          table,
          context.definitions,
          args.zone,
        );
        const shuffled = context.random.shuffle(
          [...ids],
          definition.scope === "shared"
            ? "shuffleSharedZone"
            : "shufflePlayerZone",
        );
        if (
          shuffled.length !== ids.length ||
          new Set(shuffled).size !== ids.length ||
          shuffled.some((id) => !ids.includes(id))
        )
          throw new Error("Shuffle must preserve zone membership.");
        ids.splice(0, ids.length, ...shuffled);
        invalidate(context);
      });
    },
  };
  Object.defineProperties(surface, descriptors);
  return surface;
}

function createReducerTransactionFromSurface<
  State extends { table: RuntimeTableRecord },
>(
  initialState: State,
  surface: object,
  random: TransactionRandom,
  definitions: ZoneDefinitions,
): ReducerTransaction<State> {
  const transaction = Object.create(surface) as ReducerTransaction<State> &
    TransactionHost<State>;
  Object.defineProperty(transaction, transactionContext, {
    value: {
      currentState: {
        ...initialState,
        table: cloneRuntimeTable(initialState.table),
      },
      currentQueries: null,
      methodCache: {},
      events: [],
      random,
      definitions,
    } satisfies TransactionContext<State>,
  });
  return transaction;
}

export function createReducerTransaction<
  State extends { table: RuntimeTableRecord },
>(
  initialState: State,
  random: TransactionRandom,
  definitions: ZoneDefinitions,
): ReducerTransaction<State> {
  return createReducerTransactionFromSurface(
    initialState,
    createReducerTransactionSurface<State>(),
    random,
    definitions,
  );
}

export function createReducerEdit<State extends { table: RuntimeTableRecord }>(
  definitions: ZoneDefinitions,
): ReducerEdit<State> {
  const surface = createReducerTransactionSurface<State>();
  return <DraftState extends State>(
    state: DraftState,
    random: TransactionRandom,
  ) => createReducerTransactionFromSurface(state, surface, random, definitions);
}
