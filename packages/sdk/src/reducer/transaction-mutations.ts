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
import { asPlayerId } from "./per-player";
import {
  addCardToSharedZoneInPlace as tableAddCardToSharedZoneInPlace,
  addPlayerResourcesInPlace as tableAddPlayerResourcesInPlace,
  dealCardsFromDeckToHandInPlace as tableDealCardsFromDeckToHandInPlace,
  dealCardsBetweenPlayerZonesInPlace as tableDealCardsBetweenPlayerZonesInPlace,
  moveCardBetweenPlayerZonesInPlace as tableMoveCardBetweenPlayerZonesInPlace,
  moveCardBetweenSharedZonesInPlace as tableMoveCardBetweenSharedZonesInPlace,
  moveCardFromPlayerZoneToSharedZoneInPlace as tableMoveCardFromPlayerZoneToSharedZoneInPlace,
  moveCardFromSharedZoneToPlayerZoneInPlace as tableMoveCardFromSharedZoneToPlayerZoneInPlace,
  moveComponentToContainerInPlace as tableMoveComponentToContainerInPlace,
  moveComponentToDetachedInPlace as tableMoveComponentToDetachedInPlace,
  moveComponentToEdgeInPlace as tableMoveComponentToEdgeInPlace,
  moveComponentToSpaceInPlace as tableMoveComponentToSpaceInPlace,
  moveComponentToVertexInPlace as tableMoveComponentToVertexInPlace,
  removeCardFromSharedZoneInPlace as tableRemoveCardFromSharedZoneInPlace,
  setPlayerResourceInPlace as tableSetPlayerResourceInPlace,
  spendPlayerResourcesInPlace as tableSpendPlayerResourcesInPlace,
  transferPlayerResourcesInPlace as tableTransferPlayerResourcesInPlace,
} from "./table";

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

  // --- Shared zones / decks -------------------------------------------

  /**
   * Append a card to a shared zone (deck). Defaults to placing the card at the
   * bottom; pass `position: "top"` for top-of-deck placement (e.g. Bureaucrat-style).
   */
  addCardToSharedZone<
    DeckId extends SharedZoneIdOfTable<TableOfState<State>>,
  >(args: {
    deckId: DeckId;
    cardId: DeckCardsOfTable<TableOfState<State>, DeckId>[number];
    playedBy?: PlayerIdOfTable<TableOfState<State>> | null;
    position?: "top" | "bottom";
  }): State;

  /** Remove a card from a shared zone (deck). */
  removeCardFromSharedZone<
    DeckId extends DeckIdOfTable<TableOfState<State>>,
  >(args: {
    deckId: DeckId;
    cardId: DeckCardsOfTable<TableOfState<State>, DeckId>[number];
  }): State;

  /**
   * Move a card between two shared zones (decks). Defaults to placing the card
   * at the bottom of the destination; pass `position: "top"` for top placement.
   */
  moveCardBetweenSharedZones<
    FromZoneId extends SharedZoneIdOfTable<TableOfState<State>>,
    ToZoneId extends SharedZoneIdOfTable<TableOfState<State>>,
  >(args: {
    fromZoneId: FromZoneId;
    toZoneId: ToZoneId;
    cardId: DeckCardsOfTable<TableOfState<State>, FromZoneId>[number];
    playedBy?: PlayerIdOfTable<TableOfState<State>> | null;
    position?: "top" | "bottom";
  }): State;

  /**
   * Draw the top `count` cards from one perPlayer zone into another for the
   * same player (e.g. deck → hand at the start of a turn). Companion to
   * {@link deal} for the perPlayer → perPlayer case. Stops
   * silently if the source runs out before `count` is reached.
   */
  dealCardsBetweenPlayerZones<
    FromZoneId extends PlayerZoneIdOfTable<TableOfState<State>>,
    ToZoneId extends PlayerZoneIdOfTable<TableOfState<State>>,
    PlayerId extends PlayerIdOfTable<TableOfState<State>>,
  >(args: {
    playerId: PlayerId;
    fromZoneId: FromZoneId;
    toZoneId: ToZoneId;
    count: number;
  }): State;

  /**
   * Move a card between two perPlayer zones owned by the same player (e.g.
   * hand → in-play → discard). Owner is preserved; visibility is recomputed
   * from the destination zone.
   */
  moveCardBetweenPlayerZones<
    FromZoneId extends PlayerZoneIdOfTable<TableOfState<State>>,
    ToZoneId extends PlayerZoneIdOfTable<TableOfState<State>>,
    PlayerId extends PlayerIdOfTable<TableOfState<State>>,
  >(args: {
    playerId: PlayerId;
    fromZoneId: FromZoneId;
    toZoneId: ToZoneId;
    cardId: CompatibleCardIdForTwoPlayerZones<
      TableOfState<State>,
      FromZoneId,
      ToZoneId
    >;
    position?: "top" | "bottom";
  }): State;

  /**
   * Move a card from a player zone (hand) to a shared zone (deck). Defaults to
   * placing the card at the bottom; pass `position: "top"` to topdeck.
   */
  moveCardFromPlayerZoneToSharedZone<
    FromZoneId extends PlayerZoneIdOfTable<TableOfState<State>>,
    ToZoneId extends SharedZoneIdOfTable<TableOfState<State>>,
    PlayerId extends PlayerIdOfTable<TableOfState<State>>,
  >(args: {
    playerId: PlayerId;
    fromZoneId: FromZoneId;
    toZoneId: ToZoneId;
    cardId: CompatibleCardIdForHandAndDeck<
      TableOfState<State>,
      FromZoneId,
      ToZoneId
    >;
    playedBy?: PlayerIdOfTable<TableOfState<State>> | null;
    position?: "top" | "bottom";
  }): State;

  /**
   * Move a named card from a shared zone (supply pile, deck) to a perPlayer
   * zone (e.g. discard). The "gain" verb in deck-builders. Distinct from
   * {@link deal}, which draws unspecified top-N cards from a
   * deck. Owner flips to the receiving player; visibility is recomputed.
   */
  moveCardFromSharedZoneToPlayerZone<
    FromZoneId extends SharedZoneIdOfTable<TableOfState<State>>,
    ToZoneId extends PlayerZoneIdOfTable<TableOfState<State>>,
    PlayerId extends PlayerIdOfTable<TableOfState<State>>,
  >(args: {
    playerId: PlayerId;
    fromZoneId: FromZoneId;
    toZoneId: ToZoneId;
    cardId: CompatibleCardIdForHandAndDeck<
      TableOfState<State>,
      ToZoneId,
      FromZoneId
    >;
    position?: "top" | "bottom";
  }): State;

  /**
   * Deal the top `count` cards from a shared deck into a player's hand zone.
   *
   * Dealing does not consume RNG. Shuffle first with `tx.shuffle({ zoneId })`
   * when the deck needs a random order, then call `tx.deal(...)`.
   */
  deal<
    FromZoneId extends DeckIdOfTable<TableOfState<State>>,
    PlayerId extends PlayerIdOfTable<TableOfState<State>>,
    ToZoneId extends CompatibleHandIdForDeck<TableOfState<State>, FromZoneId> &
      HandIdOfTable<TableOfState<State>>,
  >(args: {
    fromZoneId: FromZoneId;
    playerId: PlayerId;
    toZoneId: ToZoneId;
    count: number;
  }): State;

  /**
   * Atomically rotate cards in a per-player zone around the table.
   *
   * Defaults to rotating every card currently in `zoneId` for every player in
   * turn order. Pass `players` to use a smaller explicit order, or
   * `cardIdsByPlayer` to rotate only selected cards such as Hearts passes.
   */
  rotatePlayerZone<
    ZoneId extends PlayerZoneIdOfTable<TableOfState<State>>,
    PlayerId extends PlayerIdOfTable<TableOfState<State>>,
  >(
    args: RotatePlayerZoneArgs<State, ZoneId, PlayerId>,
  ): State;

  // --- Board / component movement -------------------------------------

  /** Move a component onto a board space. */
  moveComponentToSpace<
    BoardId extends BoardIdOfTable<TableOfState<State>>,
    SpaceId extends SpaceIdOfTable<TableOfState<State>, BoardId>,
    ComponentId extends ComponentIdOfTable<TableOfState<State>>,
  >(args: {
    componentId: ComponentId;
    boardId: BoardId;
    spaceId: SpaceId;
  }): State;

  /** Move a component into a board container. */
  moveComponentToContainer<
    BoardId extends BoardIdOfTable<TableOfState<State>>,
    ContainerId extends BoardContainerIdOfTable<TableOfState<State>, BoardId>,
    ComponentId extends ComponentIdOfTable<TableOfState<State>>,
  >(args: {
    componentId: ComponentId;
    boardId: BoardId;
    containerId: ContainerId;
  }): State;

  /** Move a component onto a tiled board edge. */
  moveComponentToEdge<
    BoardId extends TiledBoardIdOfTable<TableOfState<State>>,
    EdgeId extends TiledEdgeIdOfTable<TableOfState<State>, BoardId>,
    ComponentId extends ComponentIdOfTable<TableOfState<State>>,
  >(args: {
    componentId: ComponentId;
    boardId: BoardId;
    edgeId: EdgeId;
  }): State;

  /** Move a component onto a tiled board vertex. */
  moveComponentToVertex<
    BoardId extends TiledBoardIdOfTable<TableOfState<State>>,
    VertexId extends TiledVertexIdOfTable<TableOfState<State>, BoardId>,
    ComponentId extends ComponentIdOfTable<TableOfState<State>>,
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
type AnyState = { table: AnyTable };

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
  return zone[playerId] ?? [];
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
    table.zones.perPlayer[zoneId] = { ...currentZone, [player]: [...cards] };
  }
  if (currentHand) {
    table.hands[zoneId] = { ...currentHand, [player]: [...cards] };
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

function rotatePlayerZoneTableInPlace(options: {
  table: RuntimeTableRecord;
  zoneId: string;
  direction: "left" | "right";
  players?: readonly string[];
  cardIdsByPlayer?: Partial<Record<string, readonly string[]>>;
  position?: "top" | "bottom";
}): void {
  const nextTable = options.table;
  const zoneId = options.zoneId;
  if (!nextTable.zones.perPlayer[zoneId] && !nextTable.hands[zoneId]) {
    throw new Error(`Player zone '${zoneId}' does not exist.`);
  }
  const players = [...(options.players ?? nextTable.playerOrder)];
  if (players.length === 0) {
    return;
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
}

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
) => void;

type TableMoveComponentToVertexInPlaceInternal = (
  table: RuntimeTableRecord,
  componentId: string,
  boardId: string,
  vertexId: string,
) => void;

type TableDealCardsFromDeckToHandInPlaceInternal = (
  table: RuntimeTableRecord,
  fromZoneId: string,
  playerId: string,
  toZoneId: string,
  count: number,
) => void;

const moveComponentToEdgeInPlaceInternal =
  tableMoveComponentToEdgeInPlace as unknown as TableMoveComponentToEdgeInPlaceInternal;
const moveComponentToVertexInPlaceInternal =
  tableMoveComponentToVertexInPlace as unknown as TableMoveComponentToVertexInPlaceInternal;
const dealCardsFromDeckToHandInPlaceInternal =
  tableDealCardsFromDeckToHandInPlace as unknown as TableDealCardsFromDeckToHandInPlaceInternal;

const applyPatch = <T extends object>(
  prev: T,
  patch: Partial<T> | ((prev: T) => T),
): T => {
  if (typeof patch === "function") {
    return (patch as (prev: T) => T)(prev);
  }
  return { ...prev, ...patch };
};

export const transactionMutations = {
  setActivePlayers<S extends AnyState>(
    state: S,
    activePlayers: ReadonlyArray<string>,
  ): S {
    const flow = (state as S & { flow: object }).flow;
    return Object.assign(state, {
      flow: { ...flow, activePlayers: [...activePlayers] },
    });
  },
  advanceActivePlayer<S extends AnyState>(state: S): S {
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
    return transactionMutations.setActivePlayers(state, [nextId]);
  },
  patchPhaseState<S extends AnyState>(state: S, patch: unknown): S {
    const prev = (state as unknown as { phase?: object }).phase ?? {};
    const next = applyPatch(
      prev as object,
      patch as Partial<object> | ((prev: object) => object),
    );
    return Object.assign(state, { phase: next });
  },
  patchPublicState<S extends AnyState>(state: S, patch: unknown): S {
    const prev =
      (state as unknown as { publicState?: object }).publicState ?? {};
    const next = applyPatch(
      prev as object,
      patch as Partial<object> | ((prev: object) => object),
    );
    return Object.assign(state, { publicState: next });
  },
  patchHiddenState<S extends AnyState>(state: S, patch: unknown): S {
    const prev =
      (state as unknown as { hiddenState?: object }).hiddenState ?? {};
    const next = applyPatch(
      prev as object,
      patch as Partial<object> | ((prev: object) => object),
    );
    return Object.assign(state, { hiddenState: next });
  },
  patchPlayerPrivateState<S extends AnyState>(
    state: S,
    args: { playerId: string; patch: unknown },
  ): S {
    const privateByPlayer =
      (state as unknown as { privateState?: Record<string, object> })
        .privateState ?? {};
    const prev = (privateByPlayer[args.playerId] ?? {}) as object;
    const next = applyPatch(
      prev,
      args.patch as Partial<object> | ((prev: object) => object),
    );
    return Object.assign(state, {
      privateState: { ...privateByPlayer, [args.playerId]: next },
    });
  },
  addCardToSharedZone<S extends AnyState>(
    state: S,
    args: {
      deckId: string;
      cardId: string;
      playedBy?: string | null;
      position?: "top" | "bottom";
    },
  ): S {
    tableAddCardToSharedZoneInPlace(
      state.table,
      args.deckId,
      args.cardId,
      args.playedBy ?? null,
      args.position ?? "bottom",
    );
    return state;
  },
  removeCardFromSharedZone<S extends AnyState>(
    state: S,
    args: { deckId: string; cardId: string },
  ): S {
    tableRemoveCardFromSharedZoneInPlace(state.table, args.deckId, args.cardId);
    return state;
  },
  moveCardBetweenSharedZones<S extends AnyState>(
    state: S,
    args: {
      fromZoneId: string;
      toZoneId: string;
      cardId: string;
      playedBy?: string | null;
      position?: "top" | "bottom";
    },
  ): S {
    tableMoveCardBetweenSharedZonesInPlace({
      table: state.table,
      fromZoneId: args.fromZoneId,
      toZoneId: args.toZoneId,
      cardId: args.cardId,
      playedBy: args.playedBy ?? null,
      position: args.position ?? "bottom",
    });
    return state;
  },
  dealCardsBetweenPlayerZones<S extends AnyState>(
    state: S,
    args: {
      playerId: string;
      fromZoneId: string;
      toZoneId: string;
      count: number;
    },
  ): S {
    tableDealCardsBetweenPlayerZonesInPlace({
      table: state.table,
      playerId: args.playerId,
      fromZoneId: args.fromZoneId,
      toZoneId: args.toZoneId,
      count: args.count,
    });
    return state;
  },
  moveCardBetweenPlayerZones<S extends AnyState>(
    state: S,
    args: {
      playerId: string;
      fromZoneId: string;
      toZoneId: string;
      cardId: string;
      position?: "top" | "bottom";
    },
  ): S {
    tableMoveCardBetweenPlayerZonesInPlace({
      table: state.table,
      playerId: args.playerId,
      fromZoneId: args.fromZoneId,
      toZoneId: args.toZoneId,
      cardId: args.cardId,
      position: args.position ?? "bottom",
    });
    return state;
  },
  moveCardFromPlayerZoneToSharedZone<S extends AnyState>(
    state: S,
    args: {
      playerId: string;
      fromZoneId: string;
      toZoneId: string;
      cardId: string;
      playedBy?: string | null;
      position?: "top" | "bottom";
    },
  ): S {
    tableMoveCardFromPlayerZoneToSharedZoneInPlace({
      table: state.table,
      playerId: args.playerId,
      fromZoneId: args.fromZoneId,
      toZoneId: args.toZoneId,
      cardId: args.cardId,
      playedBy: args.playedBy ?? null,
      position: args.position ?? "bottom",
    });
    return state;
  },
  moveCardFromSharedZoneToPlayerZone<S extends AnyState>(
    state: S,
    args: {
      playerId: string;
      fromZoneId: string;
      toZoneId: string;
      cardId: string;
      position?: "top" | "bottom";
    },
  ): S {
    tableMoveCardFromSharedZoneToPlayerZoneInPlace({
      table: state.table,
      playerId: args.playerId,
      fromZoneId: args.fromZoneId,
      toZoneId: args.toZoneId,
      cardId: args.cardId,
      position: args.position ?? "bottom",
    });
    return state;
  },
  deal<S extends AnyState>(
    state: S,
    args: {
      fromZoneId: string;
      playerId: string;
      toZoneId: string;
      count: number;
    },
  ): S {
    dealCardsFromDeckToHandInPlaceInternal(
      state.table,
      args.fromZoneId,
      args.playerId,
      args.toZoneId,
      args.count,
    );
    return state;
  },
  rotatePlayerZone<S extends AnyState>(
    state: S,
    args: {
      zoneId: string;
      direction: "left" | "right";
      players?: readonly string[];
      cardIdsByPlayer?: Partial<Record<string, readonly string[]>>;
      position?: "top" | "bottom";
    },
  ): S {
    rotatePlayerZoneTableInPlace({
      table: state.table,
      zoneId: args.zoneId,
      direction: args.direction,
      players: args.players,
      cardIdsByPlayer: args.cardIdsByPlayer,
      position: args.position ?? "bottom",
    });
    return state;
  },
  moveComponentToSpace<S extends AnyState>(
    state: S,
    args: { componentId: string; boardId: string; spaceId: string },
  ): S {
    tableMoveComponentToSpaceInPlace(
      state.table,
      args.componentId,
      args.boardId,
      args.spaceId,
    );
    return state;
  },
  moveComponentToContainer<S extends AnyState>(
    state: S,
    args: { componentId: string; boardId: string; containerId: string },
  ): S {
    tableMoveComponentToContainerInPlace(
      state.table,
      args.componentId,
      args.boardId,
      args.containerId,
    );
    return state;
  },
  moveComponentToEdge<S extends AnyState>(
    state: S,
    args: { componentId: string; boardId: string; edgeId: string },
  ): S {
    moveComponentToEdgeInPlaceInternal(
      state.table,
      args.componentId,
      args.boardId,
      args.edgeId,
    );
    return state;
  },
  moveComponentToVertex<S extends AnyState>(
    state: S,
    args: { componentId: string; boardId: string; vertexId: string },
  ): S {
    moveComponentToVertexInPlaceInternal(
      state.table,
      args.componentId,
      args.boardId,
      args.vertexId,
    );
    return state;
  },
  moveComponentToDetached<S extends AnyState>(
    state: S,
    args: { componentId: string },
  ): S {
    tableMoveComponentToDetachedInPlace(state.table, args.componentId);
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
