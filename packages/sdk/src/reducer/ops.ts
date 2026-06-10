/**
 * Curried state writers for use with `pipe`.
 *
 * Each entry in the returned `ops` namespace is a curried transformation
 * `(args) => (state) => state` that can be composed with `pipe`:
 *
 *     const ops = createReducerOps<GameState>();
 *
 *     return accept(
 *       pipe(state,
 *         ops.setActivePlayers([playerId]),
 *         ops.moveCardFromPlayerZoneToSharedZone({
 *           playerId,
 *           fromZoneId: "things-hand",
 *           toZoneId: "ring-1",
 *           cardId: "a-dog",
 *         }),
 *       ),
 *     );
 *
 * The factory binds all ops to a specific `State` type so that ID arguments
 * (deck ids, card ids, etc.) are checked against the manifest-derived table
 * shape of the game.
 */
import type { Op } from "./compose";
import type {
  BoardContainerIdOfTable,
  BoardIdOfTable,
  CardIdOfTable,
  CompatibleHandIdForDeck,
  ComponentIdOfTable,
  CompatibleCardIdForHandAndDeck,
  CompatibleCardIdForTwoPlayerZones,
  DeckCardsOfTable,
  DeckIdOfTable,
  HandIdOfTable,
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
  SharedZoneIdOfTable,
  SpaceIdOfTable,
  TableOfState,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledVertexIdOfTable,
} from "./model";
import {
  asPlayerId,
  perPlayerGet,
  perPlayerSet,
  type PerPlayer,
} from "./per-player";
import {
  addCardToSharedZone as tableAddCardToSharedZone,
  addPlayerResources as tableAddPlayerResources,
  cloneRuntimeTable,
  dealCardsFromDeckToHand as tableDealCardsFromDeckToHand,
  dealCardsBetweenPlayerZones as tableDealCardsBetweenPlayerZones,
  moveCardBetweenPlayerZones as tableMoveCardBetweenPlayerZones,
  moveCardBetweenSharedZones as tableMoveCardBetweenSharedZones,
  moveCardFromPlayerZoneToSharedZone as tableMoveCardFromPlayerZoneToSharedZone,
  moveCardFromSharedZoneToPlayerZone as tableMoveCardFromSharedZoneToPlayerZone,
  moveComponentToContainer as tableMoveComponentToContainer,
  moveComponentToDetached as tableMoveComponentToDetached,
  moveComponentToEdge as tableMoveComponentToEdge,
  moveComponentToSpace as tableMoveComponentToSpace,
  moveComponentToVertex as tableMoveComponentToVertex,
  removeCardFromSharedZone as tableRemoveCardFromSharedZone,
  setActivePlayers as stateSetActivePlayers,
  setPhaseState as stateSetPhaseState,
  setPlayerResource as tableSetPlayerResource,
  spendPlayerResources as tableSpendPlayerResources,
  transferPlayerResources as tableTransferPlayerResources,
} from "./table";

/**
 * Minimum shape required for any state targeted by reducer ops.
 *
 * All curried writers operate on a game state with a `table` field.
 */
export type ReducerStateBase = {
  table: RuntimeTableRecord;
};

type PipeTable<State extends ReducerStateBase> = TableOfState<State>;

/**
 * A shallow patch for a slice of state. Either a partial object to merge
 * over the previous value, or a functional updater `(prev) => next`.
 */
export type StatePatch<T> = Partial<T> | ((prev: T) => T);

/**
 * Curried writer namespace for a specific game state type.
 *
 * Created via {@link createReducerOps}.
 */
export interface ReducerOps<State extends ReducerStateBase> {
  // --- Flow ------------------------------------------------------------

  /** Set the list of players whose turn is currently active. */
  setActivePlayers(
    activePlayers: ReadonlyArray<PlayerIdOfState<State>>,
  ): Op<State>;

  /**
   * Advance `flow.activePlayers` to the single next seat in `playerOrder`.
   *
   * Uses `state.flow.activePlayers[0]` as the current seat (or the first
   * seat in `playerOrder` when `activePlayers` is empty) and sets
   * `activePlayers` to `[q.player.nextInOrder(current)]`. No-op when the
   * player order is empty.
   */
  advanceActivePlayer(): Op<State>;

  // --- Author-owned state slices --------------------------------------

  /**
   * Update the current phase's local state.
   *
   * Accepts either a `Partial<PhaseState>` which is shallow-merged into the
   * previous value, or a functional updater `(prev) => next` which must
   * return a complete `PhaseState`.
   */
  patchPhaseState(patch: StatePatch<PhaseStateOfState<State>>): Op<State>;

  /**
   * Update `state.publicState`.
   *
   * Accepts either a `Partial<PublicState>` which is shallow-merged into the
   * previous value, or a functional updater `(prev) => next` which must
   * return a complete `PublicState`.
   */
  patchPublicState(patch: StatePatch<PublicStateOfState<State>>): Op<State>;

  /**
   * Update `state.hiddenState`.
   *
   * Accepts either a `Partial<HiddenState>` or a functional updater.
   */
  patchHiddenState(patch: StatePatch<HiddenStateOfState<State>>): Op<State>;

  /**
   * Update a single player's entry in `state.privateState`.
   *
   * Accepts either a `Partial<PrivateState>` or a functional updater.
   */
  patchPlayerPrivateState(args: {
    playerId: PlayerIdOfState<State>;
    patch: StatePatch<PrivateStateOfState<State>>;
  }): Op<State>;

  // --- Shared zones / decks -------------------------------------------

  /**
   * Append a card to a shared zone (deck). Defaults to placing the card at the
   * bottom; pass `position: "top"` for top-of-deck placement (e.g. Bureaucrat-style).
   */
  addCardToSharedZone<
    DeckId extends SharedZoneIdOfTable<PipeTable<State>>,
  >(args: {
    deckId: DeckId;
    cardId: DeckCardsOfTable<PipeTable<State>, DeckId>[number];
    playedBy?: PlayerIdOfTable<PipeTable<State>> | null;
    position?: "top" | "bottom";
  }): Op<State>;

  /** Remove a card from a shared zone (deck). */
  removeCardFromSharedZone<
    DeckId extends DeckIdOfTable<PipeTable<State>>,
  >(args: {
    deckId: DeckId;
    cardId: DeckCardsOfTable<PipeTable<State>, DeckId>[number];
  }): Op<State>;

  /**
   * Move a card between two shared zones (decks). Defaults to placing the card
   * at the bottom of the destination; pass `position: "top"` for top placement.
   */
  moveCardBetweenSharedZones<
    FromZoneId extends SharedZoneIdOfTable<PipeTable<State>>,
    ToZoneId extends SharedZoneIdOfTable<PipeTable<State>>,
  >(args: {
    fromZoneId: FromZoneId;
    toZoneId: ToZoneId;
    cardId: DeckCardsOfTable<PipeTable<State>, FromZoneId>[number];
    playedBy?: PlayerIdOfTable<PipeTable<State>> | null;
    position?: "top" | "bottom";
  }): Op<State>;

  /**
   * Draw the top `count` cards from one perPlayer zone into another for the
   * same player (e.g. deck → hand at the start of a turn). Companion to
   * {@link dealCardsToPlayerZone} for the perPlayer → perPlayer case. Stops
   * silently if the source runs out before `count` is reached.
   */
  dealCardsBetweenPlayerZones<
    FromZoneId extends PlayerZoneIdOfTable<PipeTable<State>>,
    ToZoneId extends PlayerZoneIdOfTable<PipeTable<State>>,
    PlayerId extends PlayerIdOfTable<PipeTable<State>>,
  >(args: {
    playerId: PlayerId;
    fromZoneId: FromZoneId;
    toZoneId: ToZoneId;
    count: number;
  }): Op<State>;

  /**
   * Move a card between two perPlayer zones owned by the same player (e.g.
   * hand → in-play → discard). Owner is preserved; visibility is recomputed
   * from the destination zone.
   */
  moveCardBetweenPlayerZones<
    FromZoneId extends PlayerZoneIdOfTable<PipeTable<State>>,
    ToZoneId extends PlayerZoneIdOfTable<PipeTable<State>>,
    PlayerId extends PlayerIdOfTable<PipeTable<State>>,
  >(args: {
    playerId: PlayerId;
    fromZoneId: FromZoneId;
    toZoneId: ToZoneId;
    cardId: CompatibleCardIdForTwoPlayerZones<
      PipeTable<State>,
      FromZoneId,
      ToZoneId
    >;
    position?: "top" | "bottom";
  }): Op<State>;

  /**
   * Move a card from a player zone (hand) to a shared zone (deck). Defaults to
   * placing the card at the bottom; pass `position: "top"` to topdeck.
   */
  moveCardFromPlayerZoneToSharedZone<
    FromZoneId extends PlayerZoneIdOfTable<PipeTable<State>>,
    ToZoneId extends SharedZoneIdOfTable<PipeTable<State>>,
    PlayerId extends PlayerIdOfTable<PipeTable<State>>,
  >(args: {
    playerId: PlayerId;
    fromZoneId: FromZoneId;
    toZoneId: ToZoneId;
    cardId: CompatibleCardIdForHandAndDeck<
      PipeTable<State>,
      FromZoneId,
      ToZoneId
    >;
    playedBy?: PlayerIdOfTable<PipeTable<State>> | null;
    position?: "top" | "bottom";
  }): Op<State>;

  /**
   * Move a named card from a shared zone (supply pile, deck) to a perPlayer
   * zone (e.g. discard). The "gain" verb in deck-builders. Distinct from
   * {@link dealCardsToPlayerZone}, which draws unspecified top-N cards from a
   * deck. Owner flips to the receiving player; visibility is recomputed.
   */
  moveCardFromSharedZoneToPlayerZone<
    FromZoneId extends SharedZoneIdOfTable<PipeTable<State>>,
    ToZoneId extends PlayerZoneIdOfTable<PipeTable<State>>,
    PlayerId extends PlayerIdOfTable<PipeTable<State>>,
  >(args: {
    playerId: PlayerId;
    fromZoneId: FromZoneId;
    toZoneId: ToZoneId;
    cardId: CompatibleCardIdForHandAndDeck<
      PipeTable<State>,
      ToZoneId,
      FromZoneId
    >;
    position?: "top" | "bottom";
  }): Op<State>;

  /**
   * Deal the top `count` cards from a shared deck into a player's hand zone.
   *
   * This op does not consume RNG. If the deck needs to be random, shuffle it
   * first with `fx.shuffleSharedZone(...)`, then deal from the shuffled deck
   * inside the same reducer via this op.
   */
  dealCardsToPlayerZone<
    FromZoneId extends DeckIdOfTable<PipeTable<State>>,
    PlayerId extends PlayerIdOfTable<PipeTable<State>>,
    ToZoneId extends CompatibleHandIdForDeck<PipeTable<State>, FromZoneId> &
      HandIdOfTable<PipeTable<State>>,
  >(args: {
    fromZoneId: FromZoneId;
    playerId: PlayerId;
    toZoneId: ToZoneId;
    count: number;
  }): Op<State>;

  /**
   * Atomically rotate cards in a per-player zone around the table.
   *
   * Defaults to rotating every card currently in `zoneId` for every player in
   * turn order. Pass `players` to use a smaller explicit order, or
   * `cardIdsByPlayer` to rotate only selected cards such as Hearts passes.
   */
  rotatePlayerZone<
    ZoneId extends PlayerZoneIdOfTable<PipeTable<State>>,
    PlayerId extends PlayerIdOfTable<PipeTable<State>>,
  >(args: {
    zoneId: ZoneId;
    direction: "left" | "right";
    players?: readonly PlayerId[];
    cardIdsByPlayer?: Partial<
      Record<PlayerId, readonly CardIdOfTable<PipeTable<State>>[]>
    >;
    position?: "top" | "bottom";
  }): Op<State>;

  // --- Board / component movement -------------------------------------

  /** Move a component onto a board space. */
  moveComponentToSpace<
    BoardId extends BoardIdOfTable<PipeTable<State>>,
    SpaceId extends SpaceIdOfTable<PipeTable<State>, BoardId>,
    ComponentId extends ComponentIdOfTable<PipeTable<State>>,
  >(args: {
    componentId: ComponentId;
    boardId: BoardId;
    spaceId: SpaceId;
  }): Op<State>;

  /** Move a component into a board container. */
  moveComponentToContainer<
    BoardId extends BoardIdOfTable<PipeTable<State>>,
    ContainerId extends BoardContainerIdOfTable<PipeTable<State>, BoardId>,
    ComponentId extends ComponentIdOfTable<PipeTable<State>>,
  >(args: {
    componentId: ComponentId;
    boardId: BoardId;
    containerId: ContainerId;
  }): Op<State>;

  /** Move a component onto a tiled board edge. */
  moveComponentToEdge<
    BoardId extends TiledBoardIdOfTable<PipeTable<State>>,
    EdgeId extends TiledEdgeIdOfTable<PipeTable<State>, BoardId>,
    ComponentId extends ComponentIdOfTable<PipeTable<State>>,
  >(args: {
    componentId: ComponentId;
    boardId: BoardId;
    edgeId: EdgeId;
  }): Op<State>;

  /** Move a component onto a tiled board vertex. */
  moveComponentToVertex<
    BoardId extends TiledBoardIdOfTable<PipeTable<State>>,
    VertexId extends TiledVertexIdOfTable<PipeTable<State>, BoardId>,
    ComponentId extends ComponentIdOfTable<PipeTable<State>>,
  >(args: {
    componentId: ComponentId;
    boardId: BoardId;
    vertexId: VertexId;
  }): Op<State>;

  /** Move a component back to the detached pool. */
  moveComponentToDetached<
    ComponentId extends ComponentIdOfTable<PipeTable<State>>,
  >(args: {
    componentId: ComponentId;
  }): Op<State>;

  // --- Resources ------------------------------------------------------

  /**
   * Credit the specified resources to a player.
   *
   * Amounts must be non-negative; use {@link spendResources} for deductions
   * so that affordability is checked explicitly.
   *
   *     pipe(
   *       state,
   *       ops.addResources({ playerId, amounts: { wood: 1, brick: 1 } }),
   *     )
   */
  addResources(args: {
    playerId: PlayerIdOfTable<PipeTable<State>>;
    amounts: ResourceAmountsOfTable<PipeTable<State>>;
  }): Op<State>;

  /**
   * Debit the specified resources from a player.
   *
   * Throws when the player cannot afford the full cost — gate with
   * `q.player.canAfford(...)` in your `validate` step before invoking.
   *
   *     pipe(
   *       state,
   *       ops.spendResources({ playerId, amounts: COST_DEV_CARD }),
   *       ops.dealCardsToPlayerZone({ ... }),
   *     )
   */
  spendResources(args: {
    playerId: PlayerIdOfTable<PipeTable<State>>;
    amounts: ResourceAmountsOfTable<PipeTable<State>>;
  }): Op<State>;

  /**
   * Transfer the specified resources from one player to another.
   *
   * Throws when the source cannot afford the full amount. On success the
   * destination gains exactly what the source loses.
   */
  transferResources(args: {
    fromPlayerId: PlayerIdOfTable<PipeTable<State>>;
    toPlayerId: PlayerIdOfTable<PipeTable<State>>;
    amounts: ResourceAmountsOfTable<PipeTable<State>>;
  }): Op<State>;

  /**
   * Overwrite a single resource balance for a player. Prefer
   * {@link addResources} / {@link spendResources} — use this only when the
   * new balance is an absolute (e.g. scripted setup).
   */
  setResource(args: {
    playerId: PlayerIdOfTable<PipeTable<State>>;
    resourceId: ResourceIdOfTable<PipeTable<State>>;
    amount: number;
  }): Op<State>;
}

// --- Internal helpers -----------------------------------------------

type AnyTable = RuntimeTableRecord;
type AnyState = { table: AnyTable };

function updateTable<S extends AnyState>(state: S, nextTable: AnyTable): S {
  return { ...state, table: nextTable };
}

function computePlayerZoneVisibility(
  table: RuntimeTableRecord,
  zoneId: string,
  playerId: string,
): { faceUp: boolean; visibleTo?: string[] } {
  const mode = table.handVisibility[zoneId];
  if (mode === "all" || mode === "public") {
    return { faceUp: true };
  }
  return { faceUp: false, visibleTo: [playerId] };
}

function readPlayerZoneCards(
  table: RuntimeTableRecord,
  zoneId: string,
  playerId: string,
): readonly string[] {
  const zone = table.zones.perPlayer[zoneId] ?? table.hands[zoneId];
  if (!zone) {
    throw new Error(`Player zone '${zoneId}' does not exist.`);
  }
  return (
    perPlayerGet(zone as PerPlayer<readonly string[]>, asPlayerId(playerId)) ??
    []
  );
}

function writePlayerZoneCards(
  table: RuntimeTableRecord,
  zoneId: string,
  playerId: string,
  cards: readonly string[],
): void {
  const currentZone = table.zones.perPlayer[zoneId];
  const currentHand = table.hands[zoneId];
  const player = asPlayerId(playerId);
  if (currentZone) {
    table.zones.perPlayer[zoneId] = perPlayerSet(
      currentZone as PerPlayer<string[]>,
      player,
      [...cards],
    );
  }
  if (currentHand) {
    table.hands[zoneId] = perPlayerSet(
      currentHand as PerPlayer<string[]>,
      player,
      [...cards],
    );
  }
}

function assertCardAllowedInPlayerZone(
  table: RuntimeTableRecord,
  zoneId: string,
  cardId: string,
): void {
  const allowedCardSetIds = table.zones.cardSetIdsByZoneId?.[zoneId];
  if (!allowedCardSetIds || allowedCardSetIds.length === 0) {
    return;
  }
  const card = table.cards[cardId];
  if (!card) {
    throw new Error(`Card '${cardId}' does not exist.`);
  }
  if (!allowedCardSetIds.includes(card.cardSetId)) {
    throw new Error(
      `Card '${cardId}' from set '${card.cardSetId}' is not allowed in player zone '${zoneId}'.`,
    );
  }
}

function rotatePlayerZoneTable(options: {
  table: RuntimeTableRecord;
  zoneId: string;
  direction: "left" | "right";
  players?: readonly string[];
  cardIdsByPlayer?: Partial<Record<string, readonly string[]>>;
  position?: "top" | "bottom";
}): RuntimeTableRecord {
  const nextTable = cloneRuntimeTable(options.table);
  const zoneId = options.zoneId;
  if (!nextTable.zones.perPlayer[zoneId] && !nextTable.hands[zoneId]) {
    throw new Error(`Player zone '${zoneId}' does not exist.`);
  }
  const players = [...(options.players ?? nextTable.playerOrder)];
  if (players.length === 0) {
    return nextTable;
  }
  const playerSet = new Set(nextTable.playerOrder);
  for (const playerId of players) {
    if (!playerSet.has(playerId)) {
      throw new Error(
        `Cannot rotate player zone '${zoneId}': player '${playerId}' is not in player order.`,
      );
    }
  }

  const selectedByPlayer = new Map<string, readonly string[]>();
  for (const playerId of players) {
    const sourceCards = readPlayerZoneCards(nextTable, zoneId, playerId);
    const selected = options.cardIdsByPlayer?.[playerId] ?? sourceCards;
    for (const cardId of selected) {
      if (!sourceCards.includes(cardId)) {
        throw new Error(
          `Cannot rotate player zone '${zoneId}': card '${cardId}' is not in zone for player '${playerId}'.`,
        );
      }
      assertCardAllowedInPlayerZone(nextTable, zoneId, cardId);
    }
    selectedByPlayer.set(playerId, [...selected]);
  }

  const removeByPlayer = new Map<string, string[]>();
  for (const playerId of players) {
    const selected = new Set(selectedByPlayer.get(playerId) ?? []);
    removeByPlayer.set(
      playerId,
      readPlayerZoneCards(nextTable, zoneId, playerId).filter(
        (cardId) => !selected.has(cardId),
      ),
    );
  }

  const additionsByPlayer = new Map<string, string[]>(
    players.map((playerId) => [playerId, []]),
  );
  for (const [index, fromPlayerId] of players.entries()) {
    const offset = options.direction === "left" ? 1 : -1;
    const recipient =
      players[(index + offset + players.length) % players.length]!;
    additionsByPlayer
      .get(recipient)!
      .push(...(selectedByPlayer.get(fromPlayerId) ?? []));
  }

  for (const playerId of players) {
    const remaining = removeByPlayer.get(playerId) ?? [];
    const additions = additionsByPlayer.get(playerId) ?? [];
    const nextCards =
      options.position === "top"
        ? [...additions, ...remaining]
        : [...remaining, ...additions];
    writePlayerZoneCards(nextTable, zoneId, playerId, nextCards);
    for (const [position, cardId] of nextCards.entries()) {
      nextTable.componentLocations[cardId] = {
        type: "InHand",
        handId: zoneId,
        playerId,
        position,
      };
      nextTable.ownerOfCard[cardId] = playerId;
      nextTable.visibility[cardId] = computePlayerZoneVisibility(
        nextTable,
        zoneId,
        playerId,
      );
    }
  }

  return nextTable;
}

/**
 * Internal, id-type-erased signatures for the board writer family.
 *
 * The public `tableMove*` helpers constrain their id args to manifest-derived
 * unions such as `TiledBoardIdOfTable<Table>`, which collapse to `never` for
 * the unconstrained `RuntimeTableRecord`. Inside `createReducerOps<State>`
 * the `State` generic is not yet bound, so at this call site we only know
 * that all ids are plain strings. These aliases narrow that distinction to
 * one place instead of leaking `as never` casts across every op body.
 */
type TableMoveComponentToEdgeInternal = (
  table: RuntimeTableRecord,
  componentId: string,
  boardId: string,
  edgeId: string,
) => RuntimeTableRecord;

type TableMoveComponentToVertexInternal = (
  table: RuntimeTableRecord,
  componentId: string,
  boardId: string,
  vertexId: string,
) => RuntimeTableRecord;

type TableDealCardsFromDeckToHandInternal = (
  table: RuntimeTableRecord,
  fromZoneId: string,
  playerId: string,
  toZoneId: string,
  count: number,
) => RuntimeTableRecord;

const moveComponentToEdgeInternal =
  tableMoveComponentToEdge as unknown as TableMoveComponentToEdgeInternal;
const moveComponentToVertexInternal =
  tableMoveComponentToVertex as unknown as TableMoveComponentToVertexInternal;
const dealCardsFromDeckToHandInternal =
  tableDealCardsFromDeckToHand as unknown as TableDealCardsFromDeckToHandInternal;

/**
 * Create the `ops.*` namespace specialised to a game state.
 *
 * Call this once (typically in a shared reducer-support module) and reuse the
 * resulting object across phases:
 *
 *     export const ops = createReducerOps<GameState>();
 */
export function createReducerOps<
  State extends ReducerStateBase,
>(): ReducerOps<State> {
  // The implementation operates on the structural `AnyState` shape; the
  // public `ReducerOps<State>` interface adds manifest-aware argument
  // validation and polymorphic state preservation on top. The final
  // `as unknown as ReducerOps<State>` bridges the two: all runtime
  // correctness is still covered by the underlying table-ops writers.
  const applyPatch = <T extends object>(
    prev: T,
    patch: Partial<T> | ((prev: T) => T),
  ): T => {
    if (typeof patch === "function") {
      return (patch as (prev: T) => T)(prev);
    }
    return { ...prev, ...patch };
  };

  const impl = {
    setActivePlayers(activePlayers: ReadonlyArray<string>) {
      return <S extends AnyState>(state: S): S =>
        stateSetActivePlayers(
          state as unknown as never,
          [...activePlayers] as never,
        ) as unknown as S;
    },
    advanceActivePlayer() {
      return <S extends AnyState>(state: S): S => {
        const table = (state as unknown as { table: RuntimeTableRecord }).table;
        const order = table.playerOrder as ReadonlyArray<string>;
        if (order.length === 0) return state;
        const flow = (
          state as unknown as { flow?: { activePlayers?: readonly string[] } }
        ).flow;
        const current = flow?.activePlayers?.[0];
        const idx = current ? order.indexOf(current) : -1;
        const nextIdx = idx < 0 ? 0 : (idx + 1) % order.length;
        const nextId = order[nextIdx];
        if (nextId === undefined) return state;
        return stateSetActivePlayers(
          state as unknown as never,
          [nextId] as never,
        ) as unknown as S;
      };
    },
    patchPhaseState(patch: unknown) {
      return <S extends AnyState>(state: S): S => {
        const prev = (state as unknown as { phase?: object }).phase ?? {};
        const next = applyPatch(
          prev as object,
          patch as Partial<object> | ((prev: object) => object),
        );
        return stateSetPhaseState(
          state as unknown as { phase: object },
          next as object,
        ) as unknown as S;
      };
    },
    patchPublicState(patch: unknown) {
      return <S extends AnyState>(state: S): S => {
        const prev =
          (state as unknown as { publicState?: object }).publicState ?? {};
        const next = applyPatch(
          prev as object,
          patch as Partial<object> | ((prev: object) => object),
        );
        return { ...state, publicState: next } as S;
      };
    },
    patchHiddenState(patch: unknown) {
      return <S extends AnyState>(state: S): S => {
        const prev =
          (state as unknown as { hiddenState?: object }).hiddenState ?? {};
        const next = applyPatch(
          prev as object,
          patch as Partial<object> | ((prev: object) => object),
        );
        return { ...state, hiddenState: next } as S;
      };
    },
    patchPlayerPrivateState(args: { playerId: string; patch: unknown }) {
      return <S extends AnyState>(state: S): S => {
        const privateByPlayer =
          (state as unknown as { privateState?: Record<string, object> })
            .privateState ?? {};
        const prev = (privateByPlayer[args.playerId] ?? {}) as object;
        const next = applyPatch(
          prev,
          args.patch as Partial<object> | ((prev: object) => object),
        );
        return {
          ...state,
          privateState: {
            ...privateByPlayer,
            [args.playerId]: next,
          },
        } as S;
      };
    },
    addCardToSharedZone(args: {
      deckId: string;
      cardId: string;
      playedBy?: string | null;
      position?: "top" | "bottom";
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableAddCardToSharedZone(
          state.table,
          args.deckId,
          args.cardId,
          args.playedBy ?? null,
          args.position ?? "bottom",
        );
        return updateTable(state, nextTable);
      };
    },
    removeCardFromSharedZone(args: { deckId: string; cardId: string }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableRemoveCardFromSharedZone(
          state.table,
          args.deckId,
          args.cardId,
        );
        return updateTable(state, nextTable);
      };
    },
    moveCardBetweenSharedZones(args: {
      fromZoneId: string;
      toZoneId: string;
      cardId: string;
      playedBy?: string | null;
      position?: "top" | "bottom";
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableMoveCardBetweenSharedZones({
          table: state.table,
          fromZoneId: args.fromZoneId,
          toZoneId: args.toZoneId,
          cardId: args.cardId,
          playedBy: args.playedBy ?? null,
          position: args.position ?? "bottom",
        });
        return updateTable(state, nextTable);
      };
    },
    dealCardsBetweenPlayerZones(args: {
      playerId: string;
      fromZoneId: string;
      toZoneId: string;
      count: number;
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableDealCardsBetweenPlayerZones({
          table: state.table,
          playerId: args.playerId,
          fromZoneId: args.fromZoneId,
          toZoneId: args.toZoneId,
          count: args.count,
        });
        return updateTable(state, nextTable);
      };
    },
    moveCardBetweenPlayerZones(args: {
      playerId: string;
      fromZoneId: string;
      toZoneId: string;
      cardId: string;
      position?: "top" | "bottom";
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableMoveCardBetweenPlayerZones({
          table: state.table,
          playerId: args.playerId,
          fromZoneId: args.fromZoneId,
          toZoneId: args.toZoneId,
          cardId: args.cardId,
          position: args.position ?? "bottom",
        });
        return updateTable(state, nextTable);
      };
    },
    moveCardFromPlayerZoneToSharedZone(args: {
      playerId: string;
      fromZoneId: string;
      toZoneId: string;
      cardId: string;
      playedBy?: string | null;
      position?: "top" | "bottom";
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableMoveCardFromPlayerZoneToSharedZone({
          table: state.table,
          playerId: args.playerId,
          fromZoneId: args.fromZoneId,
          toZoneId: args.toZoneId,
          cardId: args.cardId,
          playedBy: args.playedBy ?? null,
          position: args.position ?? "bottom",
        });
        return updateTable(state, nextTable);
      };
    },
    moveCardFromSharedZoneToPlayerZone(args: {
      playerId: string;
      fromZoneId: string;
      toZoneId: string;
      cardId: string;
      position?: "top" | "bottom";
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableMoveCardFromSharedZoneToPlayerZone({
          table: state.table,
          playerId: args.playerId,
          fromZoneId: args.fromZoneId,
          toZoneId: args.toZoneId,
          cardId: args.cardId,
          position: args.position ?? "bottom",
        });
        return updateTable(state, nextTable);
      };
    },
    dealCardsToPlayerZone(args: {
      fromZoneId: string;
      playerId: string;
      toZoneId: string;
      count: number;
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = dealCardsFromDeckToHandInternal(
          state.table,
          args.fromZoneId,
          args.playerId,
          args.toZoneId,
          args.count,
        );
        return updateTable(state, nextTable);
      };
    },
    rotatePlayerZone(args: {
      zoneId: string;
      direction: "left" | "right";
      players?: readonly string[];
      cardIdsByPlayer?: Partial<Record<string, readonly string[]>>;
      position?: "top" | "bottom";
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = rotatePlayerZoneTable({
          table: state.table,
          zoneId: args.zoneId,
          direction: args.direction,
          players: args.players,
          cardIdsByPlayer: args.cardIdsByPlayer,
          position: args.position ?? "bottom",
        });
        return updateTable(state, nextTable);
      };
    },
    moveComponentToSpace(args: {
      componentId: string;
      boardId: string;
      spaceId: string;
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableMoveComponentToSpace(
          state.table,
          args.componentId,
          args.boardId,
          args.spaceId,
        );
        return updateTable(state, nextTable);
      };
    },
    moveComponentToContainer(args: {
      componentId: string;
      boardId: string;
      containerId: string;
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableMoveComponentToContainer(
          state.table,
          args.componentId,
          args.boardId,
          args.containerId,
        );
        return updateTable(state, nextTable);
      };
    },
    moveComponentToEdge(args: {
      componentId: string;
      boardId: string;
      edgeId: string;
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = moveComponentToEdgeInternal(
          state.table,
          args.componentId,
          args.boardId,
          args.edgeId,
        );
        return updateTable(state, nextTable);
      };
    },
    moveComponentToVertex(args: {
      componentId: string;
      boardId: string;
      vertexId: string;
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = moveComponentToVertexInternal(
          state.table,
          args.componentId,
          args.boardId,
          args.vertexId,
        );
        return updateTable(state, nextTable);
      };
    },
    moveComponentToDetached(args: { componentId: string }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableMoveComponentToDetached(
          state.table,
          args.componentId,
        );
        return updateTable(state, nextTable);
      };
    },
    addResources(args: {
      playerId: string;
      amounts: Record<string, number | undefined>;
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableAddPlayerResources(
          state.table,
          args.playerId,
          args.amounts,
        );
        return updateTable(state, nextTable);
      };
    },
    spendResources(args: {
      playerId: string;
      amounts: Record<string, number | undefined>;
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableSpendPlayerResources(
          state.table,
          args.playerId,
          args.amounts,
        );
        return updateTable(state, nextTable);
      };
    },
    transferResources(args: {
      fromPlayerId: string;
      toPlayerId: string;
      amounts: Record<string, number | undefined>;
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableTransferPlayerResources(
          state.table,
          args.fromPlayerId,
          args.toPlayerId,
          args.amounts,
        );
        return updateTable(state, nextTable);
      };
    },
    setResource(args: {
      playerId: string;
      resourceId: string;
      amount: number;
    }) {
      return <S extends AnyState>(state: S): S => {
        const nextTable = tableSetPlayerResource(
          state.table,
          args.playerId,
          args.resourceId,
          args.amount,
        );
        return updateTable(state, nextTable);
      };
    },
  };

  return impl as unknown as ReducerOps<State>;
}
