import { ZoneVisibilitySchema } from "../shared/domain/manifest-schema.js";
import {
  TileDisclosureSchema,
  type TileDisclosure,
} from "../shared/domain/tile-disclosure.js";
import type { ReadonlyRuntimeData } from "../shared/runtime-json.js";
import type { TopologyDefinitions } from "../shared/domain/topology-definitions.js";
import type {
  ZoneDefinitions,
  ZoneArg,
  ZoneIdOfTable,
  ZoneComponentsOfTable,
  BoardIdOfTable,
  CardIdOfTable,
  ComponentIdOfTable,
  TileIdOfTable,
  SpatialComponentIdOfTable,
  HiddenStateOfState,
  PhaseStateOfState,
  PlayerIdOfState,
  PlayerIdOfTable,
  PlayerZoneIdOfTable,
  PrivateStateOfState,
  PublicStateOfState,
  ResourceAmountsOfTable,
  ResourceIdOfTable,
  RuntimeTableRecord,
  ReducerGameState,
  SpaceIdOfTable,
  TableOfState,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledVertexIdOfTable,
} from "./model";
import {
  moveComponentToZoneInPlace,
  dealComponentsInPlace,
  rotateZoneInPlace,
  type ZonePosition,
} from "./table/card-mutations";
import {
  addPlayerResourcesInPlace as tableAddPlayerResourcesInPlace,
  flipCardInPlace as tableFlipCardInPlace,
  moveComponentToDetachedInPlace as tableMoveComponentToDetachedInPlace,
  moveComponentToEdgeInPlace as tableMoveComponentToEdgeInPlace,
  moveComponentToSpaceInPlace as tableMoveComponentToSpaceInPlace,
  moveComponentToVertexInPlace as tableMoveComponentToVertexInPlace,
  setPlayerResourceInPlace as tableSetPlayerResourceInPlace,
  spendPlayerResourcesInPlace as tableSpendPlayerResourcesInPlace,
  transferPlayerResourcesInPlace as tableTransferPlayerResourcesInPlace,
} from "./table";

export type RotateZoneArgs<
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
  componentIdsByPlayer?: Partial<
    Record<
      PlayerId,
      readonly ZoneComponentsOfTable<TableOfState<State>, NoInfer<ZoneId>>[]
    >
  >;
  position?: "top" | "bottom";
};

/**
 * Shallow patch or functional updater for one state slice. The updater is a
 * method-style callable so a transaction over a phase-scoped state stays
 * assignable to one over the base game state; a plain function type would be
 * invariant in `T` under `strictFunctionTypes`.
 */
export type StatePatch<T> = Partial<T> | { update(prev: T): T }["update"];

/**
 * Mutations available on a transaction-owned draft.
 */
export interface TransactionMutations<
  State extends { table: RuntimeTableRecord },
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> {
  // --- Flow ------------------------------------------------------------

  /** Set the list of players whose turn is currently active. */
  setActivePlayers(activePlayers: ReadonlyArray<PlayerIdOfState<State>>): State;

  /**
   * Advance `flow.activePlayers` to the single next seat in `playerOrder`.
   *
   * Uses `state.flow.activePlayers[0]` as the current seat (or the first
   * seat in `playerOrder` when `activePlayers` is empty) and sets
   * `activePlayers` to `[q.player.nextInOrder(current)]`. No-op when the
   * player order is empty.
   */
  advanceActivePlayer(): State;

  // --- Author-owned state slices --------------------------------------

  /**
   * Update the current phase's local state.
   *
   * Accepts either a `Partial<PhaseState>` which is shallow-merged into the
   * previous value, or a functional updater `(prev) => next` which must
   * return a complete `PhaseState`.
   */
  patchPhaseState(patch: StatePatch<PhaseStateOfState<State>>): State;

  /**
   * Update `state.publicState`.
   *
   * Accepts either a `Partial<PublicState>` which is shallow-merged into the
   * previous value, or a functional updater `(prev) => next` which must
   * return a complete `PublicState`.
   */
  patchPublicState(patch: StatePatch<PublicStateOfState<State>>): State;

  /**
   * Update `state.hiddenState`.
   *
   * Accepts either a `Partial<HiddenState>` or a functional updater.
   */
  patchHiddenState(patch: StatePatch<HiddenStateOfState<State>>): State;

  /**
   * Update a single player's entry in `state.privateState`.
   *
   * Accepts either a `Partial<PrivateState>` or a functional updater.
   */
  patchPlayerPrivateState(args: {
    playerId: PlayerIdOfState<State>;
    patch: StatePatch<PrivateStateOfState<State>>;
  }): State;

  moveComponentToZone<Z extends ZoneIdOfTable<TableOfState<State>>>(args: {
    componentId: ZoneComponentsOfTable<TableOfState<State>, NoInfer<Z>>;
    to: ZoneArg<TableOfState<State>, Z>;
    position?: ZonePosition;
    playedBy?: PlayerIdOfState<State> | null;
  }): State;
  deal<
    From extends ZoneIdOfTable<TableOfState<State>>,
    To extends ZoneIdOfTable<TableOfState<State>>,
  >(args: {
    from: ZoneArg<TableOfState<State>, From>;
    to: ZoneArg<TableOfState<State>, To> &
      ([
        Extract<
          ZoneComponentsOfTable<TableOfState<State>, From>,
          ZoneComponentsOfTable<TableOfState<State>, To>
        >,
      ] extends [never]
        ? never
        : unknown);
    count: number;
  }): State;
  rotateZone<Z extends PlayerZoneIdOfTable<TableOfState<State>>>(
    args: RotateZoneArgs<State, Z>,
  ): State;
  setComponentOwner(args: {
    componentId: ComponentIdOfTable<TableOfState<State>>;
    ownerId: PlayerIdOfState<State> | null;
  }): State;
  setBoardVisibility(args: {
    boardId: BoardIdOfTable<TableOfState<State>>;
    visibility: RuntimeTableRecord["boards"][string]["visibility"];
  }): State;
  setTileDisclosure(args: {
    tileId: TileIdOfTable<TableOfState<State>>;
    disclosure: ReadonlyRuntimeData<TileDisclosure>;
  }): State;
  flipCard(args: {
    cardId: CardIdOfTable<TableOfState<State>>;
    faceUp: boolean;
  }): State;

  // --- Board / component movement -------------------------------------

  /** Move a component onto a board space. */
  moveComponentToSpace<
    BoardId extends BoardIdOfTable<TableOfState<State>>,
    SpaceId extends SpaceIdOfTable<TableOfState<State>, BoardId, Definitions>,
    ComponentId extends SpatialComponentIdOfTable<TableOfState<State>>,
  >(args: {
    componentId: ComponentId;
    boardId: BoardId;
    spaceId: SpaceId;
  }): State;

  /** Move a component onto a tiled board edge. */
  moveComponentToEdge<
    BoardId extends TiledBoardIdOfTable<TableOfState<State>, Definitions>,
    EdgeId extends TiledEdgeIdOfTable<
      TableOfState<State>,
      BoardId,
      Definitions
    >,
    ComponentId extends SpatialComponentIdOfTable<TableOfState<State>>,
  >(args: {
    componentId: ComponentId;
    boardId: BoardId;
    edgeId: EdgeId;
  }): State;

  /** Move a component onto a tiled board vertex. */
  moveComponentToVertex<
    BoardId extends TiledBoardIdOfTable<TableOfState<State>, Definitions>,
    VertexId extends TiledVertexIdOfTable<
      TableOfState<State>,
      BoardId,
      Definitions
    >,
    ComponentId extends SpatialComponentIdOfTable<TableOfState<State>>,
  >(args: {
    componentId: ComponentId;
    boardId: BoardId;
    vertexId: VertexId;
  }): State;

  /** Move a component back to the detached pool. */
  moveComponentToDetached<
    ComponentId extends ComponentIdOfTable<TableOfState<State>>,
  >(args: {
    componentId: ComponentId;
  }): State;

  // --- Resources ------------------------------------------------------

  /**
   * Credit the specified resources to a player.
   *
   * Amounts must be non-negative; use {@link spendResources} for deductions
   * so that affordability is checked explicitly.
   *
   *     tx.addResources({ playerId, amounts: { wood: 1, brick: 1 } });
   */
  addResources(args: {
    playerId: PlayerIdOfTable<TableOfState<State>>;
    amounts: ResourceAmountsOfTable<TableOfState<State>>;
  }): State;

  /**
   * Debit the specified resources from a player.
   *
   * Throws when the player cannot afford the full cost — gate with
   * `q.player.canAfford(...)` in your `validate` step before invoking.
   *
   *     tx.spendResources({ playerId, amounts: COST_DEV_CARD });
   *     tx.deal({ ... });
   */
  spendResources(args: {
    playerId: PlayerIdOfTable<TableOfState<State>>;
    amounts: ResourceAmountsOfTable<TableOfState<State>>;
  }): State;

  /**
   * Transfer the specified resources from one player to another.
   *
   * Throws when the source cannot afford the full amount. On success the
   * destination gains exactly what the source loses.
   */
  transferResources(args: {
    fromPlayerId: PlayerIdOfTable<TableOfState<State>>;
    toPlayerId: PlayerIdOfTable<TableOfState<State>>;
    amounts: ResourceAmountsOfTable<TableOfState<State>>;
  }): State;

  /**
   * Overwrite a single resource balance for a player. Prefer
   * {@link addResources} / {@link spendResources} — use this only when the
   * new balance is an absolute (e.g. scripted setup).
   */
  setResource(args: {
    playerId: PlayerIdOfTable<TableOfState<State>>;
    resourceId: ResourceIdOfTable<TableOfState<State>>;
    amount: number;
  }): State;
}

type AnyTable = RuntimeTableRecord;
type RuntimeState = ReducerGameState<
  AnyTable,
  object,
  object,
  object,
  object,
  string
>;
type AnyState = Pick<RuntimeState, "table">;

/**
 * Internal, id-type-erased signatures for the board writer family.
 *
 * The table mutation helpers constrain their id args to manifest-derived
 * unions such as `TiledBoardIdOfTable<Table>`, which collapse to `never` for
 * the unconstrained `RuntimeTableRecord`. Inside the transaction mutation implementation
 * the `State` generic is not yet bound, so at this call site we only know
 * that all ids are plain strings. These aliases narrow that distinction to
 * one place instead of leaking `as never` casts across every op body.
 */

type TableMoveComponentToEdgeInPlaceInternal = (
  table: RuntimeTableRecord,
  componentId: string,
  boardId: string,
  edgeId: string,
  definitions: ZoneDefinitions,
) => void;

type TableMoveComponentToVertexInPlaceInternal = (
  table: RuntimeTableRecord,
  componentId: string,
  boardId: string,
  vertexId: string,
  definitions: ZoneDefinitions,
) => void;

const moveComponentToEdgeInPlaceInternal =
  // eslint-disable-next-line no-restricted-syntax -- The typed transaction edge method supplies IDs from its State; this internal adapter erases only those manifest-derived ID unions.
  tableMoveComponentToEdgeInPlace as unknown as TableMoveComponentToEdgeInPlaceInternal;
const moveComponentToVertexInPlaceInternal =
  // eslint-disable-next-line no-restricted-syntax -- The typed transaction vertex method supplies IDs from its State; this internal adapter erases only those manifest-derived ID unions.
  tableMoveComponentToVertexInPlace as unknown as TableMoveComponentToVertexInPlaceInternal;

const applyPatch = <T extends object>(
  prev: T,
  patch: Partial<T> | ((prev: T) => T),
): T => {
  if (typeof patch === "function") {
    return patch(prev);
  }
  return { ...prev, ...patch };
};

export const transactionMutations = {
  setActivePlayers<S extends AnyState & Pick<RuntimeState, "flow">>(
    state: S,
    activePlayers: ReadonlyArray<string>,
  ): S {
    return Object.assign(state, {
      flow: { ...state.flow, activePlayers: [...activePlayers] },
    });
  },
  advanceActivePlayer<S extends AnyState & Pick<RuntimeState, "flow">>(
    state: S,
  ): S {
    const order = state.table.playerOrder;
    if (order.length === 0) return state;
    const current = state.flow.activePlayers[0];
    const idx = current ? order.indexOf(current) : -1;
    const nextIdx = idx < 0 ? 0 : (idx + 1) % order.length;
    const nextId = order[nextIdx];
    if (nextId === undefined) return state;
    return transactionMutations.setActivePlayers(state, [nextId]);
  },
  patchPhaseState<S extends AnyState & Pick<RuntimeState, "phase">>(
    state: S,
    patch: StatePatch<S["phase"]>,
  ): S {
    return Object.assign(state, { phase: applyPatch(state.phase, patch) });
  },
  patchPublicState<S extends AnyState & Pick<RuntimeState, "publicState">>(
    state: S,
    patch: StatePatch<S["publicState"]>,
  ): S {
    return Object.assign(state, {
      publicState: applyPatch(state.publicState, patch),
    });
  },
  patchHiddenState<S extends AnyState & Pick<RuntimeState, "hiddenState">>(
    state: S,
    patch: StatePatch<S["hiddenState"]>,
  ): S {
    return Object.assign(state, {
      hiddenState: applyPatch(state.hiddenState, patch),
    });
  },
  patchPlayerPrivateState<
    Private extends object,
    S extends AnyState &
      Pick<
        ReducerGameState<AnyTable, object, Private, object, object, string>,
        "privateState"
      >,
  >(state: S, args: { playerId: string; patch: StatePatch<Private> }): S {
    const privateByPlayer = state.privateState;
    // The transaction player id belongs to the initialized roster.
    const prev = privateByPlayer[args.playerId];
    const next = applyPatch(prev, args.patch);
    return Object.assign(state, {
      privateState: { ...privateByPlayer, [args.playerId]: next },
    });
  },
  moveComponentToZone<S extends AnyState>(
    state: S,
    args: Omit<
      Parameters<typeof moveComponentToZoneInPlace>[0],
      "table" | "definitions"
    >,
    definitions: ZoneDefinitions,
  ): S {
    moveComponentToZoneInPlace({ table: state.table, definitions, ...args });
    return state;
  },
  deal<S extends AnyState>(
    state: S,
    args: Omit<
      Parameters<typeof dealComponentsInPlace>[0],
      "table" | "definitions"
    >,
    definitions: ZoneDefinitions,
  ): S {
    dealComponentsInPlace({ table: state.table, definitions, ...args });
    return state;
  },
  rotateZone<S extends AnyState>(
    state: S,
    args: Omit<
      Parameters<typeof rotateZoneInPlace>[0],
      "table" | "definitions"
    >,
    definitions: ZoneDefinitions,
  ): S {
    rotateZoneInPlace({ table: state.table, definitions, ...args });
    return state;
  },
  setComponentOwner<S extends AnyState>(
    state: S,
    args: { componentId: string; ownerId: string | null },
  ): S {
    const { componentId, ownerId } = args;
    if (ownerId !== null && !state.table.playerOrder.includes(ownerId))
      throw new Error("Component owner must name an active player.");
    if (Object.hasOwn(state.table.cards, componentId))
      state.table.ownerOfCard[componentId] = ownerId;
    else if (Object.hasOwn(state.table.pieces, componentId))
      state.table.pieces[componentId] = {
        ...state.table.pieces[componentId],
        ownerId,
      };
    else if (Object.hasOwn(state.table.dice, componentId))
      state.table.dice[componentId] = {
        ...state.table.dice[componentId],
        ownerId,
      };
    else if (Object.hasOwn(state.table.tiles, componentId))
      state.table.tiles[componentId] = {
        ...state.table.tiles[componentId],
        ownerId,
      };
    else throw new Error(`Unknown component '${componentId}'.`);
    return state;
  },
  setBoardVisibility<S extends AnyState>(
    state: S,
    args: { boardId: string; visibility: unknown },
    definitions: ZoneDefinitions,
  ): S {
    const board = Object.hasOwn(state.table.boards, args.boardId)
      ? state.table.boards[args.boardId]
      : undefined;
    if (!board) throw new Error(`Unknown board '${args.boardId}'.`);
    const visibility = ZoneVisibilitySchema.parse(args.visibility);
    const definition = Object.hasOwn(definitions.boardDefinitions, board.baseId)
      ? definitions.boardDefinitions[board.baseId]
      : undefined;
    if (!definition)
      throw new Error(`Unknown board definition '${board.baseId}'.`);
    if (visibility === "ownerOnly" && definition.scope === "shared")
      throw new Error("ownerOnly board visibility requires perPlayer scope.");
    state.table.boards[args.boardId] = { ...board, visibility };
    return state;
  },
  setTileDisclosure<S extends AnyState>(
    state: S,
    args: { tileId: string; disclosure: unknown },
  ): S {
    const tile = Object.hasOwn(state.table.tiles, args.tileId)
      ? state.table.tiles[args.tileId]
      : undefined;
    if (!tile) throw new Error(`Unknown tile '${args.tileId}'.`);
    const disclosure = TileDisclosureSchema.parse(args.disclosure);
    if (
      disclosure.face.audience === "seats" &&
      disclosure.face.playerIds.some(
        (playerId) => !state.table.playerOrder.includes(playerId),
      )
    )
      throw new Error("Tile face audience must name active roster players.");
    const location = state.table.componentLocations[args.tileId];
    if (
      location?.type === "OnBoard" &&
      disclosure.appearance !== undefined &&
      disclosure.appearance.layout !== location.layout
    )
      throw new Error(
        "Tile public appearance must match its board placement layout.",
      );
    state.table.tiles[args.tileId] = { ...tile, disclosure };
    return state;
  },
  flipCard<S extends AnyState>(
    state: S,
    args: { cardId: string; faceUp: boolean },
  ): S {
    tableFlipCardInPlace(state.table, args.cardId, args.faceUp);
    return state;
  },
  moveComponentToSpace<S extends AnyState>(
    state: S,
    args: { componentId: string; boardId: string; spaceId: string },
    definitions: ZoneDefinitions,
  ): S {
    tableMoveComponentToSpaceInPlace(
      state.table,
      args.componentId,
      args.boardId,
      args.spaceId,
      definitions,
    );
    return state;
  },
  moveComponentToEdge<S extends AnyState>(
    state: S,
    args: { componentId: string; boardId: string; edgeId: string },
    definitions: ZoneDefinitions,
  ): S {
    moveComponentToEdgeInPlaceInternal(
      state.table,
      args.componentId,
      args.boardId,
      args.edgeId,
      definitions,
    );
    return state;
  },
  moveComponentToVertex<S extends AnyState>(
    state: S,
    args: { componentId: string; boardId: string; vertexId: string },
    definitions: ZoneDefinitions,
  ): S {
    moveComponentToVertexInPlaceInternal(
      state.table,
      args.componentId,
      args.boardId,
      args.vertexId,
      definitions,
    );
    return state;
  },
  moveComponentToDetached<S extends AnyState>(
    state: S,
    args: { componentId: string },
    definitions: ZoneDefinitions,
  ): S {
    tableMoveComponentToDetachedInPlace(
      state.table,
      args.componentId,
      definitions,
    );
    return state;
  },
  addResources<S extends AnyState>(
    state: S,
    args: { playerId: string; amounts: Record<string, number | undefined> },
  ): S {
    tableAddPlayerResourcesInPlace(state.table, args.playerId, args.amounts);
    return state;
  },
  spendResources<S extends AnyState>(
    state: S,
    args: { playerId: string; amounts: Record<string, number | undefined> },
  ): S {
    tableSpendPlayerResourcesInPlace(state.table, args.playerId, args.amounts);
    return state;
  },
  transferResources<S extends AnyState>(
    state: S,
    args: {
      fromPlayerId: string;
      toPlayerId: string;
      amounts: Record<string, number | undefined>;
    },
  ): S {
    tableTransferPlayerResourcesInPlace(
      state.table,
      args.fromPlayerId,
      args.toPlayerId,
      args.amounts,
    );
    return state;
  },
  setResource<S extends AnyState>(
    state: S,
    args: { playerId: string; resourceId: string; amount: number },
  ): S {
    tableSetPlayerResourceInPlace(
      state.table,
      args.playerId,
      args.resourceId,
      args.amount,
    );
    return state;
  },
};
