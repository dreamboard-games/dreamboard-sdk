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
import { createReducerOps, type ReducerOps } from "./ops";
import { createStateQueries } from "./table-queries";

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

export function createReducerTransaction<
  State extends { table: RuntimeTableRecord },
>(initialState: State, ops: ReducerOps<State> = createReducerOps<State>()) {
  let currentState = initialState;
  let currentQueries = createStateQueries(currentState);

  const refresh = (nextState: State): State => {
    currentState = nextState;
    currentQueries = createStateQueries(currentState);
    return currentState;
  };

  const apply = (op: Op<State>): State => refresh(op(currentState));

  const base = {
    get state() {
      return currentState;
    },
    get q() {
      return currentQueries;
    },
    apply,
  };

  return new Proxy(base, {
    get(target, property, receiver) {
      if (property in target) {
        return Reflect.get(target, property, receiver);
      }
      const opFactory = ops[property as keyof ReducerOps<State>];
      if (typeof opFactory !== "function") {
        return undefined;
      }
      return (...args: readonly unknown[]) => {
        const op = (opFactory as (...args: readonly unknown[]) => Op<State>)(
          ...args,
        );
        return apply(op);
      };
    },
  }) as ReducerTransaction<State>;
}

export function createReducerEdit<State extends { table: RuntimeTableRecord }>(
  ops: ReducerOps<State> = createReducerOps<State>(),
): ReducerEdit<State> {
  return <DraftState extends State>(state: DraftState) =>
    createReducerTransaction(state, ops as unknown as ReducerOps<DraftState>);
}
