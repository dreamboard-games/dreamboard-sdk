import type { Op } from "./compose";
import { createReducerFx } from "./effects";
import type {
  BoardIdOfTable,
  CardIdOfTable,
  ComponentIdOfTable,
  EffectInvokeOptions,
  EffectSpecLike,
  GameEvent,
  GameOutcome,
  PhaseNameOfState,
  PlayerIdOfState,
  PlayerIdOfTable,
  PlayerZoneIdOfTable,
  ReducerAccept,
  ReducerReject,
  RuntimeTableRecord,
  SpaceIdOfTable,
  TableOfState,
  TableQueriesOfState,
} from "./model";
import {
  createReducerOps,
  getReducerOpsInternal,
  type ReducerOpsInternal,
  type ReducerOps,
} from "./ops";
import type { RuntimeInstructionForState } from "./core/runtime-instruction";
import { createStateQueries } from "./table-queries";

type IsAny<Value> = 0 extends 1 & Value ? true : false;

type WithFlow<State> = State extends { flow: { currentPhase: string } }
  ? State
  : State & { flow: { currentPhase: string } };

/** Phase names a transaction may transition to; `string` when state is erased. */
type TransitionTarget<State> =
  IsAny<State> extends true ? string : PhaseNameOfState<State>;
import { cloneRuntimeTable } from "./table/clone";

export type RotatePlayerZoneArgs<
  State extends { table: RuntimeTableRecord },
  ZoneId extends PlayerZoneIdOfTable<TableOfState<State>> = PlayerZoneIdOfTable<
    TableOfState<State>
  >,
  PlayerId extends PlayerIdOfTable<TableOfState<State>> = PlayerIdOfTable<
    TableOfState<State>
  >,
> = {
  zoneId: ZoneId;
  direction: "left" | "right";
  players?: readonly PlayerId[];
  cardIdsByPlayer?: Partial<
    Record<PlayerId, readonly CardIdOfTable<TableOfState<State>>[]>
  >;
  position?: "top" | "bottom";
};

/**
 * Method-style callable. Method parameters are compared bivariantly, so a
 * transaction over a phase-scoped state stays assignable to one over the base
 * game state (and vice versa for engine-erased states). Function-typed
 * properties would be invariant under `strictFunctionTypes`.
 */
type BivariantMethod<Args extends readonly unknown[], Result> = {
  method(...args: Args): Result;
}["method"];

type TransactionMethods<State extends { table: RuntimeTableRecord }> = {
  [Key in Exclude<
    keyof ReducerOps<State>,
    "moveComponentToSpace"
  >]: ReducerOps<State>[Key] extends (...args: infer Args) => Op<State>
    ? BivariantMethod<Args, State>
    : never;
} & {
  moveComponentToSpace<
    BoardId extends BoardIdOfTable<TableOfState<State>>,
    SpaceId extends SpaceIdOfTable<TableOfState<State>, BoardId>,
    ComponentId extends ComponentIdOfTable<TableOfState<State>>,
  >(args: {
    componentId: ComponentId;
    boardId: BoardId;
    spaceId: SpaceId;
  }): State;
};

/**
 * Result builders on the transaction. A mutation callback ends with one of
 * these or with a bare `return` (accept the transaction as it stands).
 */
export type ReducerTransactionOutcome<
  State extends { table: RuntimeTableRecord },
  ErrorCode extends string = string,
> = {
  /** Record events on the eventual accept result. */
  emit(...events: GameEvent[]): void;
  /** Queue runtime instructions on the eventual accept result. */
  schedule(...instructions: RuntimeInstructionForState<State>[]): void;
  /** Queue an engine effect authored with `defineEffect`. */
  effect<Effect extends EffectSpecLike>(
    effect: Effect,
    options: EffectInvokeOptions<Effect, WithFlow<State>>,
  ): void;
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
> = TransactionMethods<State> &
  ReducerTransactionOutcome<State, ErrorCode> & {
    readonly state: State;
    readonly q: TableQueriesOfState<State>;
    apply(op: Op<State>): State;
    rotatePlayerZone<
      ZoneId extends PlayerZoneIdOfTable<TableOfState<State>>,
      PlayerId extends PlayerIdOfTable<TableOfState<State>>,
    >(
      args: RotatePlayerZoneArgs<State, ZoneId, PlayerId>,
    ): State;
  };

export type ReducerEdit<State extends { table: RuntimeTableRecord }> = <
  DraftState extends State,
>(
  state: DraftState,
) => ReducerTransaction<DraftState>;

const transactionContext = Symbol("dreamboard.reducerTransactionContext");

type TransactionContext<State extends { table: RuntimeTableRecord }> = {
  currentState: State;
  currentQueries: TableQueriesOfState<State> | null;
  internalOps: ReducerOpsInternal<State>;
  methodCache: Record<string, (...args: readonly unknown[]) => State>;
  applyMethod?: (op: Op<State>) => State;
  events: GameEvent[];
  instructions: RuntimeInstructionForState<State>[];
  outcome?: ReducerTransactionOutcome<State>;
};

function createOutcomeMethods<State extends { table: RuntimeTableRecord }>(
  context: TransactionContext<State>,
): ReducerTransactionOutcome<State> {
  const fx = createReducerFx<never>();
  const accept = (): ReducerAccept<State> => ({
    type: "accept",
    state: context.currentState,
    instructions: [...context.instructions],
    events: [...context.events],
  });
  return {
    emit(...events) {
      context.events.push(...events);
    },
    schedule(...instructions) {
      context.instructions.push(...instructions);
    },
    effect(effect, options) {
      context.instructions.push(fx.effect(effect, options as never) as never);
    },
    accept,
    transition(to) {
      const result = accept();
      return {
        ...result,
        instructions: [
          ...(result.instructions ?? []),
          fx.transition(to as never) as never,
        ],
      };
    },
    endGame(outcome, options) {
      const result = accept();
      return {
        ...result,
        instructions: options?.transition
          ? [
              ...(result.instructions ?? []),
              fx.transition(options.transition as never) as never,
            ]
          : result.instructions,
        terminal: outcome,
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

function applyTransactionOp<State extends { table: RuntimeTableRecord }>(
  context: TransactionContext<State>,
  op: Op<State>,
): State {
  context.currentState = op(context.currentState);
  invalidate(context);
  return context.currentState;
}

function runInternal<State extends { table: RuntimeTableRecord }>(
  context: TransactionContext<State>,
  key: keyof ReducerOps<State>,
  args: readonly unknown[],
): State {
  context.currentState = (
    context.internalOps[key] as unknown as (
      state: State,
      ...args: readonly unknown[]
    ) => State
  )(context.currentState, ...args);
  invalidate(context);
  return context.currentState;
}

function createReducerTransactionSurface<
  State extends { table: RuntimeTableRecord },
>(ops: ReducerOps<State>) {
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
        context.currentQueries ??= createStateQueries(context.currentState);
        return context.currentQueries;
      },
    },
    apply: {
      enumerable: true,
      get(this: unknown) {
        const context = getTransactionContext<State>(this);
        context.applyMethod ??= (op: Op<State>) =>
          applyTransactionOp(context, op);
        return context.applyMethod;
      },
    },
  };

  for (const key of [
    "emit",
    "schedule",
    "effect",
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

  for (const key of Object.keys(ops) as Array<keyof ReducerOps<State>>) {
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

  Object.defineProperties(surface, descriptors);
  return surface;
}

function createReducerTransactionFromSurface<
  State extends { table: RuntimeTableRecord },
>(
  initialState: State,
  internalOps: ReducerOpsInternal<State>,
  surface: object,
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
      internalOps,
      methodCache: {},
      events: [],
      instructions: [],
    } satisfies TransactionContext<State>,
  });
  return transaction;
}

export function createReducerTransaction<
  State extends { table: RuntimeTableRecord },
>(initialState: State, ops: ReducerOps<State> = createReducerOps<State>()) {
  const internalOps = getReducerOpsInternal(ops);
  const surface = createReducerTransactionSurface(ops);
  return createReducerTransactionFromSurface(
    initialState,
    internalOps,
    surface,
  );
}

export function createReducerEdit<State extends { table: RuntimeTableRecord }>(
  ops: ReducerOps<State> = createReducerOps<State>(),
): ReducerEdit<State> {
  const internalOps = getReducerOpsInternal(ops);
  const surface = createReducerTransactionSurface(ops);
  return <DraftState extends State>(state: DraftState) =>
    createReducerTransactionFromSurface(
      state,
      internalOps as unknown as ReducerOpsInternal<DraftState>,
      surface,
    );
}
