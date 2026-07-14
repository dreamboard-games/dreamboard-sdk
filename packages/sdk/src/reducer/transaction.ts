import type { Op } from "./compose";
import type {
  BoardIdOfTable,
  CardIdOfTable,
  ComponentIdOfTable,
  PlayerIdOfTable,
  PlayerZoneIdOfTable,
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
import { createStateQueries } from "./table-queries";
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

type TransactionMethods<State extends { table: RuntimeTableRecord }> = {
  [Key in Exclude<
    keyof ReducerOps<State>,
    "moveComponentToSpace"
  >]: ReducerOps<State>[Key] extends (...args: infer Args) => Op<State>
    ? (...args: Args) => State
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

export type ReducerTransaction<State extends { table: RuntimeTableRecord }> =
  TransactionMethods<State> & {
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
};

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
