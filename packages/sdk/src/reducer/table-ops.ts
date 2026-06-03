import type {
  CardCollection,
  ViewCard,
  ViewSlotOccupant,
} from "../types/index.js";
import type {
  BoardContainerIdOfTable,
  BoardIdOfTable,
  BoardTypeIdOfTable,
  CardIdOfTable,
  CardIdOfState,
  ComponentLocationOfTable,
  ComponentIdOfTable,
  CompatibleCardIdForHandAndDeck,
  CompatibleCardIdForTwoPlayerZones,
  DeckCardsOfTable,
  DeckIdOfTable,
  HandCardsOfTable,
  HandIdOfTable,
  HexBoardIdOfTable,
  HexEdgeIdOfTable,
  HexSpaceIdOfTable,
  HexVertexIdOfTable,
  PlayerIdOfState,
  PlayerIdOfTable,
  PlayerZoneIdOfTable,
  RelationTypeIdOfTable,
  ResolvedContainerLocation,
  ResolvedDeckLocation,
  ResolvedEdgeLocation,
  ResolvedHandLocation,
  ResolvedSlotLocation,
  ResolvedSpaceLocation,
  ResolvedVertexLocation,
  ResolvedZoneLocation,
  ResourceBalancesOfTable,
  RuntimeBoardState,
  RuntimeComponentLocation,
  RuntimeRecord,
  RuntimeTableRecord,
  SquareBoardIdOfTable,
  SquareSpaceIdOfTable,
  SharedZoneIdOfTable,
  SpaceIdOfTable,
  SpaceTypeIdOfTable,
  TableOfState,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledEdgeStateOfTable,
  TiledEdgeTypeIdOfTable,
  TiledVertexIdOfTable,
  TiledVertexStateOfTable,
  TiledVertexTypeIdOfTable,
} from "./model";
import type { PerPlayer, PlayerId } from "./per-player";
import { perPlayerGet, perPlayerMap, perPlayerSet } from "./per-player";

// Thin wrappers that preserve the existing "look up by player id" idiom used
// throughout this file. `hands`, `zones.perPlayer`, and `resources` are
// `PerPlayer<T>`-shaped at runtime (the ingress codec rejects anything else),
// so these helpers assume the wrapper is always present.
function ppRead<Value>(
  value: PerPlayer<Value> | undefined,
  playerId: string,
): Value | undefined {
  if (value === undefined) return undefined;
  return perPlayerGet(value, playerId as PlayerId);
}

function ppWrite<Value>(
  value: PerPlayer<Value> | undefined,
  playerId: string,
  next: Value,
): PerPlayer<Value> {
  const base: PerPlayer<Value> = value ?? { __perPlayer: true, entries: [] };
  return perPlayerSet(base, playerId as PlayerId, next);
}

type ViewCardForTable<
  Table extends RuntimeTableRecord,
  CardId extends CardIdOfTable<Table>,
> =
  CardId extends CardIdOfTable<Table>
    ? ViewCard<
        CardId & string,
        Table["cards"][CardId]["cardType"] & string,
        Extract<Table["cards"][CardId]["properties"], Record<string, unknown>>
      >
    : never;

type ViewSlotOccupantForTable<Table extends RuntimeTableRecord> =
  ViewSlotOccupant<
    ComponentIdOfTable<Table> & string,
    PlayerIdOfTable<Table> & string,
    string,
    Record<string, unknown>
  >;

export function ensureArray<T>(value: readonly T[] | T[] | undefined): T[] {
  return Array.isArray(value) ? [...value] : [];
}

function locationPosition(location: RuntimeComponentLocation): number {
  return "position" in location && typeof location.position === "number"
    ? location.position
    : Number.MAX_SAFE_INTEGER;
}

function orderedComponentIdsForLocation(
  table: RuntimeTableRecord,
  predicate: (location: RuntimeComponentLocation) => boolean,
): string[] {
  return Object.entries(table.componentLocations)
    .filter(([, location]) => predicate(location))
    .sort(
      (left, right) => locationPosition(left[1]) - locationPosition(right[1]),
    )
    .map(([componentId]) => componentId);
}

function allowedCardSetIdsForZone(
  table: RuntimeTableRecord,
  zoneId: string,
): readonly string[] {
  return table.zones.cardSetIdsByZoneId?.[zoneId] ?? [];
}

function hasOwnKey(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isSharedZoneId(table: RuntimeTableRecord, zoneId: string): boolean {
  return (
    hasOwnKey(table.decks, zoneId) || hasOwnKey(table.zones.shared, zoneId)
  );
}

function isPlayerZoneId(table: RuntimeTableRecord, zoneId: string): boolean {
  return (
    hasOwnKey(table.hands, zoneId) ||
    hasOwnKey(table.zones.perPlayer, zoneId) ||
    hasOwnKey(table.handVisibility, zoneId)
  );
}

function zoneScopeForId(
  table: RuntimeTableRecord,
  zoneId: string,
): "shared" | "perPlayer" | null {
  if (isPlayerZoneId(table, zoneId)) {
    return "perPlayer";
  }
  if (isSharedZoneId(table, zoneId)) {
    return "shared";
  }
  return null;
}

function assertZoneScope(
  table: RuntimeTableRecord,
  zoneId: string,
  expectedScope: "shared" | "perPlayer",
  operation: string,
  argumentName: string,
): void {
  const actualScope = zoneScopeForId(table, zoneId);
  if (actualScope === expectedScope) {
    return;
  }

  if (actualScope === null) {
    throw new Error(
      `Unknown zone '${zoneId}' passed as ${argumentName} to ${operation}.`,
    );
  }

  throw new Error(
    `Zone '${zoneId}' has scope '${actualScope}', but ${operation} requires ${argumentName} to be a ${expectedScope === "shared" ? "shared" : "perPlayer"} zone.`,
  );
}

function matchesSlotHost(
  location: RuntimeComponentLocation,
  host: Extract<RuntimeComponentLocation, { type: "InSlot" }>["host"],
  slotId?: string,
): location is Extract<RuntimeComponentLocation, { type: "InSlot" }> {
  return (
    location.type === "InSlot" &&
    location.host.kind === host.kind &&
    location.host.id === host.id &&
    (slotId === undefined || location.slotId === slotId)
  );
}

function componentPlayerId<Table extends RuntimeTableRecord>(
  table: Table,
  componentId: ComponentIdOfTable<Table>,
): (PlayerIdOfTable<Table> & string) | null {
  const piece = table.pieces[componentId];
  if (piece) {
    return (piece.ownerId ?? null) as (PlayerIdOfTable<Table> & string) | null;
  }

  const die = table.dice[componentId];
  if (die) {
    return (die.ownerId ?? null) as (PlayerIdOfTable<Table> & string) | null;
  }

  const owner = table.ownerOfCard[componentId];
  if (owner !== undefined) {
    return (owner ?? null) as (PlayerIdOfTable<Table> & string) | null;
  }

  return null;
}

function componentData<Table extends RuntimeTableRecord>(
  table: Table,
  componentId: ComponentIdOfTable<Table>,
): Record<string, unknown> | undefined {
  const piece = table.pieces[componentId];
  if (piece) {
    return piece.properties as Record<string, unknown>;
  }

  const die = table.dice[componentId];
  if (die) {
    return die.properties as Record<string, unknown>;
  }

  const card = table.cards[componentId];
  if (card) {
    return card.properties as Record<string, unknown>;
  }

  return undefined;
}

export function assertCardAllowedInZone<Table extends RuntimeTableRecord>(
  table: Table,
  zoneId: string,
  componentId: string,
): void {
  const card = table.cards[componentId];
  if (!card) {
    return;
  }

  const allowedCardSetIds = allowedCardSetIdsForZone(table, zoneId);
  if (
    allowedCardSetIds.length > 0 &&
    !allowedCardSetIds.includes(card.cardSetId)
  ) {
    throw new Error(
      `Card '${componentId}' from card set '${card.cardSetId}' cannot enter zone '${zoneId}'.`,
    );
  }
}

function cloneRuntimeBoardState(board: RuntimeBoardState): RuntimeBoardState {
  if (board.layout !== "generic") {
    return {
      ...board,
      fields: { ...board.fields },
      spaces: Object.fromEntries(
        Object.entries(board.spaces).map(([spaceId, space]) => [
          spaceId,
          {
            ...space,
            fields: { ...space.fields },
          },
        ]),
      ),
      relations: board.relations.map((relation) => ({
        ...relation,
        fields: { ...relation.fields },
      })),
      containers: Object.fromEntries(
        Object.entries(board.containers).map(([containerId, container]) => [
          containerId,
          {
            ...container,
            fields: { ...container.fields },
          },
        ]),
      ),
      edges: board.edges.map((edge) => ({
        ...edge,
        spaceIds: [...edge.spaceIds],
        fields: { ...edge.fields },
      })),
      vertices: board.vertices.map((vertex) => ({
        ...vertex,
        spaceIds: [...vertex.spaceIds],
        fields: { ...vertex.fields },
      })),
    };
  }

  return {
    ...board,
    fields: { ...board.fields },
    spaces: Object.fromEntries(
      Object.entries(board.spaces).map(([spaceId, space]) => [
        spaceId,
        {
          ...space,
          fields: { ...space.fields },
        },
      ]),
    ),
    relations: board.relations.map((relation) => ({
      ...relation,
      fields: { ...relation.fields },
    })),
    containers: Object.fromEntries(
      Object.entries(board.containers).map(([containerId, container]) => [
        containerId,
        {
          ...container,
          fields: { ...container.fields },
        },
      ]),
    ),
  };
}

export function cloneRuntimeTable<Table extends RuntimeTableRecord>(
  table: Table,
): Table {
  return {
    ...table,
    zones: {
      shared: Object.fromEntries(
        Object.entries(table.zones.shared).map(([zoneId, componentIds]) => [
          zoneId,
          [...componentIds],
        ]),
      ) as Table["zones"]["shared"],
      perPlayer: Object.fromEntries(
        Object.entries(table.zones.perPlayer).map(([zoneId, players]) => [
          zoneId,
          perPlayerMap(players as PerPlayer<string[]>, (componentIds) => [
            ...componentIds,
          ]),
        ]),
      ) as Table["zones"]["perPlayer"],
      visibility: { ...table.zones.visibility },
      cardSetIdsByZoneId: table.zones.cardSetIdsByZoneId
        ? Object.fromEntries(
            Object.entries(table.zones.cardSetIdsByZoneId).map(
              ([zoneId, cardSetIds]) => [zoneId, [...cardSetIds]],
            ),
          )
        : table.zones.cardSetIdsByZoneId,
    } as Table["zones"],
    decks: Object.fromEntries(
      Object.entries(table.decks).map(([deckId, cards]) => [
        deckId,
        [...cards],
      ]),
    ) as Table["decks"],
    hands: Object.fromEntries(
      Object.entries(table.hands).map(([handId, players]) => [
        handId,
        perPlayerMap(players as PerPlayer<string[]>, (cards) => [...cards]),
      ]),
    ) as Table["hands"],
    handVisibility: { ...table.handVisibility },
    pieces: Object.fromEntries(
      Object.entries(table.pieces).map(([pieceId, piece]) => [
        pieceId,
        { ...piece },
      ]),
    ) as Table["pieces"],
    componentLocations: { ...table.componentLocations },
    ownerOfCard: { ...table.ownerOfCard },
    visibility: { ...table.visibility },
    resources: perPlayerMap(
      table.resources as PerPlayer<RuntimeRecord>,
      (resources) => ({ ...resources }),
    ) as Table["resources"],
    boards: {
      ...table.boards,
      byId: Object.fromEntries(
        Object.entries(table.boards.byId).map(([boardId, board]) => [
          boardId,
          cloneRuntimeBoardState(board),
        ]),
      ),
      hex: Object.fromEntries(
        Object.entries(table.boards.hex ?? {}).map(([boardId, board]) => [
          boardId,
          cloneRuntimeBoardState(board),
        ]),
      ),
      square: Object.fromEntries(
        Object.entries(table.boards.square ?? {}).map(([boardId, board]) => [
          boardId,
          cloneRuntimeBoardState(board),
        ]),
      ),
    } as Table["boards"],
    dice: Object.fromEntries(
      Object.entries(table.dice).map(([dieId, die]) => [dieId, { ...die }]),
    ) as Table["dice"],
  };
}

function syncSharedZoneWithDeck<
  Table extends RuntimeTableRecord,
  ZoneId extends SharedZoneIdOfTable<Table>,
>(table: Table, zoneId: ZoneId, nextCards: readonly string[]): void {
  table.decks[zoneId] = [...nextCards] as Table["decks"][ZoneId];
  table.zones.shared[zoneId] = [
    ...nextCards,
  ] as Table["zones"]["shared"][ZoneId];
}

/**
 * Read or write a per-player zone's card list by mutating `table` in place.
 * Called with no `nextCards` to read; called with `nextCards` to write the
 * new ordering. Returns the list at the read site as a plain array.
 *
 * Used by engine-side per-player shuffle resolution; authors should reach for
 * the named ops in this file.
 */
export function shufflePlayerZoneCards(
  table: RuntimeTableRecord,
  zoneId: string,
  playerId: string,
  nextCards?: readonly string[],
): string[] {
  if (nextCards === undefined) {
    const fromZone = ppRead(
      table.zones.perPlayer[zoneId] ?? table.hands[zoneId],
      playerId,
    ) as readonly string[] | undefined;
    return [...ensureArray(fromZone)];
  }
  table.hands[zoneId] = ppWrite(table.hands[zoneId], playerId, [
    ...nextCards,
  ]) as (typeof table.hands)[string];
  table.zones.perPlayer[zoneId] = ppWrite(
    table.zones.perPlayer[zoneId],
    playerId,
    [...nextCards],
  ) as (typeof table.zones.perPlayer)[string];
  return [...nextCards];
}

function syncPlayerZoneWithHand<
  Table extends RuntimeTableRecord,
  ZoneId extends PlayerZoneIdOfTable<Table>,
  PlayerId extends PlayerIdOfTable<Table>,
>(
  table: Table,
  zoneId: ZoneId,
  playerId: PlayerId,
  nextCards: readonly string[],
): void {
  table.hands[zoneId] = ppWrite(table.hands[zoneId], playerId as string, [
    ...nextCards,
  ]) as Table["hands"][ZoneId];
  table.zones.perPlayer[zoneId] = ppWrite(
    table.zones.perPlayer[zoneId],
    playerId as string,
    [...nextCards],
  ) as Table["zones"]["perPlayer"][ZoneId];
}

function reindexSpaceOccupants<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<Table>,
  SpaceId extends SpaceIdOfTable<Table, BoardId>,
>(table: Table, boardId: BoardId, spaceId: SpaceId): void {
  getComponentsOnSpace(table, boardId, spaceId).forEach(
    (componentId, index) => {
      const location = table.componentLocations[componentId];
      if (location?.type === "OnSpace") {
        table.componentLocations[componentId] = {
          ...location,
          position: index,
        };
      }
    },
  );
}

function reindexContainerOccupants<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<Table>,
  ContainerId extends BoardContainerIdOfTable<Table, BoardId>,
>(table: Table, boardId: BoardId, containerId: ContainerId): void {
  getComponentsInContainer(table, boardId, containerId).forEach(
    (componentId, index) => {
      const location = table.componentLocations[componentId];
      if (location?.type === "InContainer") {
        table.componentLocations[componentId] = {
          ...location,
          position: index,
        };
      }
    },
  );
}

function reindexEdgeOccupants<
  Table extends RuntimeTableRecord,
  BoardId extends HexBoardIdOfTable<Table>,
  EdgeId extends HexEdgeIdOfTable<Table, BoardId>,
>(table: Table, boardId: BoardId, edgeId: EdgeId): void {
  orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "OnEdge" &&
      location.boardId === boardId &&
      location.edgeId === edgeId,
  ).forEach((componentId, index) => {
    const location = table.componentLocations[componentId];
    if (location?.type === "OnEdge") {
      table.componentLocations[componentId] = {
        ...location,
        position: index,
      };
    }
  });
}

function reindexVertexOccupants<
  Table extends RuntimeTableRecord,
  BoardId extends HexBoardIdOfTable<Table>,
  VertexId extends HexVertexIdOfTable<Table, BoardId>,
>(table: Table, boardId: BoardId, vertexId: VertexId): void {
  orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "OnVertex" &&
      location.boardId === boardId &&
      location.vertexId === vertexId,
  ).forEach((componentId, index) => {
    const location = table.componentLocations[componentId];
    if (location?.type === "OnVertex") {
      table.componentLocations[componentId] = {
        ...location,
        position: index,
      };
    }
  });
}

function reindexSlotOccupants<Table extends RuntimeTableRecord>(
  table: Table,
  host: Extract<RuntimeComponentLocation, { type: "InSlot" }>["host"],
  slotId: string,
): void {
  orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "InSlot" &&
      location.host.kind === host.kind &&
      location.host.id === host.id &&
      location.slotId === slotId,
  ).forEach((componentId, index) => {
    const location = table.componentLocations[componentId];
    if (location?.type === "InSlot") {
      table.componentLocations[componentId] = {
        ...location,
        position: index,
      };
    }
  });
}

function removeComponentFromCurrentLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
>(table: Table, componentId: ComponentId): void {
  const currentLocation = table.componentLocations[componentId];
  if (!currentLocation) {
    return;
  }

  if (currentLocation.type === "InDeck") {
    const nextCards = ensureArray(table.decks[currentLocation.deckId]).filter(
      (candidate) => candidate !== componentId,
    );
    syncSharedZoneWithDeck(
      table,
      currentLocation.deckId as SharedZoneIdOfTable<Table>,
      nextCards,
    );
    nextCards.forEach((cardId, index) => {
      const location = table.componentLocations[cardId];
      if (location?.type === "InDeck") {
        table.componentLocations[cardId] = {
          ...location,
          position: index,
        };
      }
    });
    return;
  }

  if (currentLocation.type === "InHand") {
    const nextCards = ensureArray(
      ppRead(table.hands[currentLocation.handId], currentLocation.playerId),
    ).filter((candidate) => candidate !== componentId);
    syncPlayerZoneWithHand(
      table,
      currentLocation.handId as PlayerZoneIdOfTable<Table>,
      currentLocation.playerId as PlayerIdOfTable<Table>,
      nextCards,
    );
    nextCards.forEach((cardId, index) => {
      const location = table.componentLocations[cardId];
      if (location?.type === "InHand") {
        table.componentLocations[cardId] = {
          ...location,
          position: index,
        };
      }
    });
    return;
  }

  if (currentLocation.type === "OnSpace") {
    delete table.componentLocations[componentId];
    reindexSpaceOccupants(
      table,
      currentLocation.boardId as BoardIdOfTable<Table>,
      currentLocation.spaceId as SpaceIdOfTable<Table, BoardIdOfTable<Table>>,
    );
    return;
  }

  if (currentLocation.type === "InZone") {
    if (currentLocation.zoneId in table.zones.shared) {
      const nextComponents = ensureArray(
        table.zones.shared[currentLocation.zoneId],
      ).filter((candidate) => candidate !== componentId);
      syncSharedZoneWithDeck(
        table,
        currentLocation.zoneId as SharedZoneIdOfTable<Table>,
        nextComponents,
      );
      nextComponents.forEach((currentComponentId, index) => {
        const location = table.componentLocations[currentComponentId];
        if (location?.type === "InZone") {
          table.componentLocations[currentComponentId] = {
            ...location,
            position: index,
          };
        }
      });
    }
    delete table.componentLocations[componentId];
    return;
  }

  if (currentLocation.type === "InContainer") {
    delete table.componentLocations[componentId];
    reindexContainerOccupants(
      table,
      currentLocation.boardId as BoardIdOfTable<Table>,
      currentLocation.containerId as BoardContainerIdOfTable<
        Table,
        BoardIdOfTable<Table>
      >,
    );
    return;
  }

  if (currentLocation.type === "OnEdge") {
    delete table.componentLocations[componentId];
    reindexEdgeOccupants(
      table,
      currentLocation.boardId as HexBoardIdOfTable<Table>,
      currentLocation.edgeId as HexEdgeIdOfTable<
        Table,
        HexBoardIdOfTable<Table>
      >,
    );
    return;
  }

  if (currentLocation.type === "OnVertex") {
    delete table.componentLocations[componentId];
    reindexVertexOccupants(
      table,
      currentLocation.boardId as HexBoardIdOfTable<Table>,
      currentLocation.vertexId as HexVertexIdOfTable<
        Table,
        HexBoardIdOfTable<Table>
      >,
    );
    return;
  }

  if (currentLocation.type === "InSlot") {
    delete table.componentLocations[componentId];
    reindexSlotOccupants(table, currentLocation.host, currentLocation.slotId);
    return;
  }

  delete table.componentLocations[componentId];
}

function appendToDeck<
  Table extends RuntimeTableRecord,
  DeckId extends DeckIdOfTable<Table>,
>(
  table: Table,
  deckId: DeckId,
  cardId: DeckCardsOfTable<Table, DeckId>[number],
  playedBy: PlayerIdOfTable<Table> | null = null,
  position: "top" | "bottom" = "bottom",
): Table {
  const nextTable = cloneRuntimeTable(table);
  assertZoneScope(
    nextTable,
    deckId as string,
    "shared",
    "addCardToSharedZone",
    "zoneId",
  );
  const deckCards = [
    ...ensureArray(nextTable.decks[deckId]),
  ] as DeckCardsOfTable<Table, DeckId>;
  assertCardAllowedInZone(nextTable, deckId, cardId);
  if (position === "top") {
    deckCards.unshift(cardId);
  } else {
    deckCards.push(cardId);
  }
  syncSharedZoneWithDeck(nextTable, deckId, deckCards);
  for (const [index, currentCardId] of deckCards.entries()) {
    if (currentCardId === cardId) {
      nextTable.componentLocations[currentCardId] = {
        type: "InDeck",
        deckId,
        playedBy,
        position: index,
      };
      continue;
    }
    const existing = nextTable.componentLocations[currentCardId];
    nextTable.componentLocations[currentCardId] = {
      type: "InDeck",
      deckId,
      playedBy: existing?.type === "InDeck" ? existing.playedBy : null,
      position: index,
    };
  }
  nextTable.ownerOfCard[cardId] = playedBy;
  nextTable.visibility[cardId] = {
    faceUp: true,
  };
  return nextTable;
}

function removeFromDeck<
  Table extends RuntimeTableRecord,
  DeckId extends DeckIdOfTable<Table>,
>(
  table: Table,
  deckId: DeckId,
  cardId: DeckCardsOfTable<Table, DeckId>[number],
): Table {
  const nextTable = cloneRuntimeTable(table);
  assertZoneScope(
    nextTable,
    deckId as string,
    "shared",
    "removeCardFromSharedZone",
    "zoneId",
  );
  const remaining = ensureArray(nextTable.decks[deckId]).filter(
    (candidate) => candidate !== cardId,
  );
  syncSharedZoneWithDeck(nextTable, deckId, remaining);
  for (const [index, currentCardId] of remaining.entries()) {
    const currentLocation = nextTable.componentLocations[currentCardId];
    if (currentLocation?.type === "InDeck") {
      nextTable.componentLocations[currentCardId] = {
        ...currentLocation,
        position: index,
      };
    }
  }
  return nextTable;
}

function computeVisibilityForPlayerZone(
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

function moveFromHandToDeck<
  Table extends RuntimeTableRecord,
  HandId extends HandIdOfTable<Table>,
  PlayerId extends PlayerIdOfTable<Table>,
  DeckId extends DeckIdOfTable<Table>,
>(options: {
  table: Table;
  playerId: PlayerId;
  handId: HandId;
  cardId: CompatibleCardIdForHandAndDeck<Table, HandId, DeckId>;
  deckId: DeckId;
  playedBy?: PlayerIdOfTable<Table> | null;
  position?: "top" | "bottom";
}): Table {
  const nextTable = cloneRuntimeTable(options.table);
  assertZoneScope(
    nextTable,
    options.handId as string,
    "perPlayer",
    "moveCardFromPlayerZoneToSharedZone",
    "fromZoneId",
  );
  assertZoneScope(
    nextTable,
    options.deckId as string,
    "shared",
    "moveCardFromPlayerZoneToSharedZone",
    "toZoneId",
  );
  const currentHand = ensureArray(
    ppRead(nextTable.hands[options.handId], options.playerId as string) as
      | readonly string[]
      | undefined,
  ).filter((candidate) => candidate !== options.cardId);
  syncPlayerZoneWithHand(
    nextTable,
    options.handId,
    options.playerId,
    currentHand,
  );
  for (const [index, currentCardId] of currentHand.entries()) {
    nextTable.componentLocations[currentCardId as string] = {
      type: "InHand",
      handId: options.handId,
      playerId: options.playerId,
      position: index,
    };
  }
  nextTable.ownerOfCard[options.cardId] = options.playedBy ?? options.playerId;
  nextTable.visibility[options.cardId] = {
    faceUp: true,
  };
  return appendToDeck(
    nextTable,
    options.deckId,
    options.cardId,
    options.playedBy ?? options.playerId,
    options.position ?? "bottom",
  );
}

export function setActivePlayers<
  State extends { flow: { activePlayers: PlayerIdOfState<State>[] } },
>(state: State, activePlayers: PlayerIdOfState<State>[]): State {
  return {
    ...state,
    flow: {
      ...state.flow,
      activePlayers,
    },
  };
}

export function setPhaseState<State extends { phase: object }, PhaseState>(
  state: State,
  phaseState: PhaseState,
): State {
  return {
    ...state,
    phase: phaseState,
  };
}

type DeckCardsForZone<
  Table extends RuntimeTableRecord,
  ZoneId extends DeckIdOfTable<Table>,
> = ZoneId extends infer Each extends DeckIdOfTable<Table>
  ? DeckCardsOfTable<Table, Each>
  : never;

type HandCardsForZone<
  Table extends RuntimeTableRecord,
  ZoneId extends HandIdOfTable<Table>,
> = ZoneId extends infer Each extends HandIdOfTable<Table>
  ? HandCardsOfTable<Table, Each>
  : never;

export function getSharedZoneCards<
  Table extends RuntimeTableRecord,
  ZoneId extends SharedZoneIdOfTable<Table>,
>(table: Table, zoneId: ZoneId): DeckCardsForZone<Table, ZoneId> {
  assertZoneScope(
    table,
    zoneId as string,
    "shared",
    "getSharedZoneCards",
    "zoneId",
  );
  return [
    ...ensureArray(table.zones.shared[zoneId] ?? table.decks[zoneId]),
  ] as DeckCardsForZone<Table, ZoneId>;
}

export function getPlayerZoneCards<
  Table extends RuntimeTableRecord,
  ZoneId extends PlayerZoneIdOfTable<Table>,
  PlayerId extends PlayerIdOfTable<Table>,
>(
  table: Table,
  playerId: PlayerId,
  zoneId: ZoneId,
): HandCardsForZone<Table, ZoneId> {
  assertZoneScope(
    table,
    zoneId as string,
    "perPlayer",
    "getPlayerZoneCards",
    "zoneId",
  );
  const cards =
    ppRead(table.zones.perPlayer[zoneId], playerId as string) ??
    ppRead(table.hands[zoneId], playerId as string);
  return [
    ...ensureArray(cards as readonly string[] | undefined),
  ] as unknown as HandCardsForZone<Table, ZoneId>;
}

function collectZoneIds(
  ...sources: ReadonlyArray<Record<string, unknown> | undefined>
): string[] {
  const seen = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      seen.add(key);
    }
  }
  return [...seen];
}

export function getAllSharedZoneCards<Table extends RuntimeTableRecord>(
  table: Table,
): {
  readonly [Z in SharedZoneIdOfTable<Table>]: DeckCardsOfTable<Table, Z>;
} {
  const zoneIds = collectZoneIds(
    table.zones.shared as Record<string, unknown> | undefined,
    table.decks as Record<string, unknown> | undefined,
  );
  const result: Record<string, readonly unknown[]> = {};
  for (const zoneId of zoneIds) {
    result[zoneId] = getSharedZoneCards(
      table,
      zoneId as SharedZoneIdOfTable<Table>,
    );
  }
  return result as {
    readonly [Z in SharedZoneIdOfTable<Table>]: DeckCardsOfTable<Table, Z>;
  };
}

export function getAllPlayerZoneCards<
  Table extends RuntimeTableRecord,
  ZoneId extends PlayerZoneIdOfTable<Table>,
>(
  table: Table,
  zoneId: ZoneId,
): {
  readonly [P in PlayerIdOfTable<Table>]: HandCardsOfTable<Table, ZoneId>;
} {
  const result: Record<string, readonly unknown[]> = {};
  for (const playerId of table.playerOrder) {
    result[playerId] = getPlayerZoneCards(
      table,
      playerId as PlayerIdOfTable<Table>,
      zoneId,
    );
  }
  return result as {
    readonly [P in PlayerIdOfTable<Table>]: HandCardsOfTable<Table, ZoneId>;
  };
}

export function getCard<
  Table extends RuntimeTableRecord,
  CardId extends CardIdOfTable<NoInfer<Table>>,
>(table: Table, cardId: CardId): ViewCardForTable<Table, CardId> {
  const card = table.cards[cardId] as Table["cards"][CardId];

  return {
    id: card.id,
    cardType: card.cardType,
    name: card.name,
    text: card.text,
    properties: card.properties,
  } as ViewCardForTable<Table, CardId>;
}

export function getCardsById<
  Table extends RuntimeTableRecord,
  const CardIds extends readonly CardIdOfTable<NoInfer<Table>>[],
>(
  table: Table,
  cardIds: CardIds,
): Readonly<{
  [Id in CardIds[number]]: ViewCardForTable<Table, Id> | undefined;
}> {
  return Object.fromEntries(
    cardIds.map((cardId) => [
      cardId,
      table.cards[cardId] ? getCard(table, cardId) : undefined,
    ]),
  ) as Readonly<{
    [Id in CardIds[number]]: ViewCardForTable<Table, Id> | undefined;
  }>;
}

export function getSharedZoneCardCollection<
  Table extends RuntimeTableRecord,
  ZoneId extends SharedZoneIdOfTable<Table>,
>(
  table: Table,
  zoneId: ZoneId,
): CardCollection<
  CardIdOfTable<Table> & string,
  ViewCardForTable<Table, CardIdOfTable<Table>>
> {
  const cardIds = getSharedZoneCards(table, zoneId);

  return {
    cardIds: cardIds as readonly (CardIdOfTable<Table> & string)[],
    cardsById: getCardsById(table, cardIds as readonly CardIdOfTable<Table>[]),
  };
}

export function getPlayerZoneCardCollection<
  Table extends RuntimeTableRecord,
  ZoneId extends PlayerZoneIdOfTable<Table>,
  PlayerId extends PlayerIdOfTable<Table>,
>(
  table: Table,
  playerId: PlayerId,
  zoneId: ZoneId,
): CardCollection<
  CardIdOfTable<Table> & string,
  ViewCardForTable<Table, CardIdOfTable<Table>>
> {
  const cardIds = getPlayerZoneCards(table, playerId, zoneId);

  return {
    cardIds: cardIds as readonly (CardIdOfTable<Table> & string)[],
    cardsById: getCardsById(table, cardIds as readonly CardIdOfTable<Table>[]),
  };
}

export function getSlotOccupants<Table extends RuntimeTableRecord>(
  table: Table,
  host: Extract<RuntimeComponentLocation, { type: "InSlot" }>["host"],
  slotId: string,
): ViewSlotOccupantForTable<Table>[] {
  return orderedComponentIdsForLocation(table, (location) =>
    matchesSlotHost(location, host, slotId),
  ).map((componentId) => ({
    pieceId: componentId as ComponentIdOfTable<Table> & string,
    playerId: componentPlayerId(
      table,
      componentId as ComponentIdOfTable<Table>,
    ),
    slotId,
    data: componentData(table, componentId as ComponentIdOfTable<Table>),
  }));
}

export function getSlotOccupantsByHost<Table extends RuntimeTableRecord>(
  table: Table,
  host: Extract<RuntimeComponentLocation, { type: "InSlot" }>["host"],
): Readonly<Record<string, ViewSlotOccupantForTable<Table>[]>> {
  const occupantsBySlot: Record<string, ViewSlotOccupantForTable<Table>[]> = {};

  orderedComponentIdsForLocation(table, (location) =>
    matchesSlotHost(location, host),
  ).forEach((componentId) => {
    const location = table.componentLocations[componentId];
    if (!location || !matchesSlotHost(location, host)) {
      return;
    }

    const slotOccupant: ViewSlotOccupantForTable<Table> = {
      pieceId: componentId as ComponentIdOfTable<Table> & string,
      playerId: componentPlayerId(
        table,
        componentId as ComponentIdOfTable<Table>,
      ),
      slotId: location.slotId,
      data: componentData(table, componentId as ComponentIdOfTable<Table>),
    };

    (occupantsBySlot[location.slotId] ??= []).push(slotOccupant);
  });

  return occupantsBySlot;
}

export function getCardOwner<
  Table extends RuntimeTableRecord,
  CardId extends CardIdOfTable<NoInfer<Table>>,
>(table: Table, cardId: CardId): Table["ownerOfCard"][CardId] {
  return table.ownerOfCard[cardId] as Table["ownerOfCard"][CardId];
}

export function getCardVisibility<
  Table extends RuntimeTableRecord,
  CardId extends CardIdOfTable<NoInfer<Table>>,
>(table: Table, cardId: CardId): Table["visibility"][CardId] {
  return table.visibility[cardId] as Table["visibility"][CardId];
}

export function getPlayerOrder<Table extends RuntimeTableRecord>(
  table: Table,
): Table["playerOrder"] {
  return table.playerOrder;
}

export function getPlayerResources<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: PlayerIdOfTable<NoInfer<Table>>,
): ResourceBalancesOfTable<Table> {
  return perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as unknown as PlayerId,
  ) as ResourceBalancesOfTable<Table>;
}

/**
 * Read the amount a player holds of a single resource. Returns `0` when the
 * player has never accumulated that resource.
 */
export function getPlayerResourceAmount<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  resourceId: string,
): number {
  const playerResources = perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as PlayerId,
  );
  if (!playerResources) return 0;
  const value = (playerResources as Record<string, unknown>)[resourceId];
  return typeof value === "number" ? value : 0;
}

/**
 * Sum of every resource amount for a player (e.g. "total cards in hand"
 * games). Skips `undefined` and non-number values.
 */
export function getPlayerResourceTotal<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
): number {
  const playerResources = perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as PlayerId,
  );
  if (!playerResources) return 0;
  let total = 0;
  for (const key of Object.keys(playerResources)) {
    const value = (playerResources as Record<string, unknown>)[key];
    if (typeof value === "number") total += value;
  }
  return total;
}

/**
 * Next player in seating order after `playerId`, wrapping around to the
 * first seat. Returns `null` when `playerId` is not in the player order or
 * the order is empty.
 */
export function getNextPlayerInOrder<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
): PlayerIdOfTable<Table> | null {
  const order = table.playerOrder as unknown as ReadonlyArray<
    PlayerIdOfTable<Table>
  >;
  if (order.length === 0) return null;
  const idx = order.indexOf(playerId as PlayerIdOfTable<Table>);
  if (idx < 0) return null;
  return order[(idx + 1) % order.length] ?? null;
}

/**
 * Iterate a resource-amounts record, skipping undefined / non-positive entries.
 * Shared by the resource mutation helpers below.
 */
function forEachResourceEntry(
  amounts: Readonly<Record<string, number | undefined>>,
  visit: (resourceId: string, amount: number) => void,
): void {
  for (const resourceId of Object.keys(amounts)) {
    const amount = amounts[resourceId];
    if (typeof amount !== "number" || amount === 0) continue;
    visit(resourceId, amount);
  }
}

/**
 * Return `true` when `playerId` has at least the requested `amounts` of each
 * resource. Unknown resource ids are treated as zero-balance (i.e. requesting
 * one of them returns `false` unless the requested amount is also zero).
 */
export function canAffordResources<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): boolean {
  for (const resourceId of Object.keys(amounts)) {
    const required = amounts[resourceId];
    if (typeof required !== "number" || required <= 0) continue;
    if (getPlayerResourceAmount(table, playerId, resourceId) < required) {
      return false;
    }
  }
  return true;
}

/**
 * Return the subset of `amounts` that the player cannot afford. The returned
 * record maps resource id → shortfall. Empty when the player can afford the
 * full cost.
 */
export function getMissingResources<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): Record<string, number> {
  const missing: Record<string, number> = {};
  for (const resourceId of Object.keys(amounts)) {
    const required = amounts[resourceId];
    if (typeof required !== "number" || required <= 0) continue;
    const have = getPlayerResourceAmount(table, playerId, resourceId);
    if (have < required) missing[resourceId] = required - have;
  }
  return missing;
}

function withPlayerResources<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  nextForPlayer: Record<string, number>,
): Table {
  return {
    ...table,
    resources: perPlayerSet(
      table.resources as PerPlayer<RuntimeRecord>,
      playerId as PlayerId,
      nextForPlayer as RuntimeRecord,
    ),
  } as Table;
}

/**
 * Increment each resource in `amounts` for `playerId`. Negative entries are
 * rejected — prefer {@link spendPlayerResources} for deductions so that
 * affordability is checked explicitly.
 */
export function addPlayerResources<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): Table {
  const prev = (perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as PlayerId,
  ) ?? {}) as Record<string, number>;
  const next: Record<string, number> = { ...prev };
  forEachResourceEntry(amounts, (resourceId, amount) => {
    if (amount < 0) {
      throw new Error(
        `addPlayerResources: negative amount for resource '${resourceId}'. ` +
          `Use spendPlayerResources or transferPlayerResources instead.`,
      );
    }
    next[resourceId] = (next[resourceId] ?? 0) + amount;
  });
  return withPlayerResources(table, playerId, next);
}

/**
 * Deduct each resource in `amounts` from `playerId`. Throws when the player
 * cannot afford the full cost — callers must check `canAfford` in their
 * `validate` phase before invoking this op.
 */
export function spendPlayerResources<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): Table {
  if (!canAffordResources(table, playerId, amounts)) {
    const missing = getMissingResources(table, playerId, amounts);
    throw new Error(
      `spendPlayerResources: player '${playerId}' cannot afford ${JSON.stringify(
        missing,
      )}. Check canAfford in your validate step first.`,
    );
  }
  const prev = (perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as PlayerId,
  ) ?? {}) as Record<string, number>;
  const next: Record<string, number> = { ...prev };
  forEachResourceEntry(amounts, (resourceId, amount) => {
    if (amount < 0) {
      throw new Error(
        `spendPlayerResources: negative amount for resource '${resourceId}'. ` +
          `Pass positive amounts — the op deducts them from the player.`,
      );
    }
    next[resourceId] = Math.max(0, (next[resourceId] ?? 0) - amount);
  });
  return withPlayerResources(table, playerId, next);
}

/**
 * Transfer the specified `amounts` from one player to another. Fails when the
 * source player cannot afford the full cost; on success the destination
 * gains exactly what the source loses.
 */
export function transferPlayerResources<Table extends RuntimeTableRecord>(
  table: Table,
  fromPlayerId: string,
  toPlayerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): Table {
  const afterSpend = spendPlayerResources(table, fromPlayerId, amounts);
  return addPlayerResources(afterSpend, toPlayerId, amounts);
}

/**
 * Overwrite a single resource balance for a player. Prefer the additive or
 * subtractive helpers — use this only when the new balance is an absolute
 * (e.g. "set coins to 10" for a scripted setup).
 */
export function setPlayerResource<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  resourceId: string,
  amount: number,
): Table {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(
      `setPlayerResource: amount must be a non-negative finite number, got ${amount}.`,
    );
  }
  const prev = (perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as PlayerId,
  ) ?? {}) as Record<string, number>;
  return withPlayerResources(table, playerId, {
    ...prev,
    [resourceId]: amount,
  });
}

export function getComponentLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ComponentLocationOfTable<Table, ComponentId> | undefined {
  return table.componentLocations[componentId] as
    | ComponentLocationOfTable<Table, ComponentId>
    | undefined;
}

export function getComponentDeckLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedDeckLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "InDeck") {
    return null;
  }

  return {
    componentId,
    deckId: location.deckId as DeckIdOfTable<Table>,
    cards: table.decks[location.deckId as DeckIdOfTable<Table>],
    location,
  } as ResolvedDeckLocation<Table, ComponentId>;
}

export function getComponentHandLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedHandLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "InHand") {
    return null;
  }

  return {
    componentId,
    handId: location.handId as HandIdOfTable<Table>,
    playerId: location.playerId as PlayerIdOfTable<Table>,
    cards: ppRead(
      table.hands[location.handId as HandIdOfTable<Table>],
      location.playerId as string,
    ),
    location,
  } as unknown as ResolvedHandLocation<Table, ComponentId>;
}

export function getComponentZoneLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedZoneLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "InZone") {
    return null;
  }

  return {
    componentId,
    zoneId: location.zoneId,
    location,
  } as ResolvedZoneLocation<Table, ComponentId>;
}

export function getComponentSpaceLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedSpaceLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "OnSpace") {
    return null;
  }

  const boardId = location.boardId as BoardIdOfTable<Table>;
  const spaceId = location.spaceId as SpaceIdOfTable<Table, typeof boardId>;
  return {
    componentId,
    boardId,
    board: getBoard(table, boardId),
    spaceId,
    space: getSpace(table, boardId, spaceId),
    location,
  } as ResolvedSpaceLocation<Table, ComponentId>;
}

export function getComponentContainerLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedContainerLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "InContainer") {
    return null;
  }

  const boardId = location.boardId as BoardIdOfTable<Table>;
  const containerId = location.containerId as BoardContainerIdOfTable<
    Table,
    typeof boardId
  >;
  return {
    componentId,
    boardId,
    board: getBoard(table, boardId),
    containerId,
    container: getContainer(table, boardId, containerId),
    location,
  } as ResolvedContainerLocation<Table, ComponentId>;
}

export function getComponentEdgeLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedEdgeLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "OnEdge") {
    return null;
  }

  const boardId = location.boardId as TiledBoardIdOfTable<Table>;
  const edgeId = location.edgeId as TiledEdgeIdOfTable<Table, typeof boardId>;
  return {
    componentId,
    boardId,
    board: getTiledBoard(table, boardId),
    edgeId,
    edge: getEdge(table, boardId, edgeId),
    location,
  } as ResolvedEdgeLocation<Table, ComponentId>;
}

export function getComponentVertexLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedVertexLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "OnVertex") {
    return null;
  }

  const boardId = location.boardId as TiledBoardIdOfTable<Table>;
  const vertexId = location.vertexId as TiledVertexIdOfTable<
    Table,
    typeof boardId
  >;
  return {
    componentId,
    boardId,
    board: getTiledBoard(table, boardId),
    vertexId,
    vertex: getVertex(table, boardId, vertexId),
    location,
  } as ResolvedVertexLocation<Table, ComponentId>;
}

export function getComponentSlotLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedSlotLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "InSlot") {
    return null;
  }

  return {
    componentId,
    host: location.host,
    slotId: location.slotId,
    location,
  } as ResolvedSlotLocation<Table, ComponentId>;
}

export function getBoard<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
>(table: Table, boardId: BoardId): Table["boards"]["byId"][BoardId] {
  return table.boards.byId[boardId] as Table["boards"]["byId"][BoardId];
}

export function getHexBoard<
  Table extends RuntimeTableRecord,
  BoardId extends HexBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
): Extract<Table["boards"]["byId"][BoardId], { layout: "hex" }> {
  return getBoard(table, boardId) as Extract<
    Table["boards"]["byId"][BoardId],
    { layout: "hex" }
  >;
}

export function getTiledBoard<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
): Extract<Table["boards"]["byId"][BoardId], { layout: "hex" | "square" }> {
  return getBoard(table, boardId) as Extract<
    Table["boards"]["byId"][BoardId],
    { layout: "hex" | "square" }
  >;
}

export function getSquareBoard<
  Table extends RuntimeTableRecord,
  BoardId extends SquareBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
): Extract<Table["boards"]["byId"][BoardId], { layout: "square" }> {
  return getBoard(table, boardId) as Extract<
    Table["boards"]["byId"][BoardId],
    { layout: "square" }
  >;
}

export function getSpace<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceId,
): Table["boards"]["byId"][BoardId]["spaces"][SpaceId] {
  return getBoard(table, boardId).spaces[
    spaceId
  ] as Table["boards"]["byId"][BoardId]["spaces"][SpaceId];
}

export function getHexSpace<
  Table extends RuntimeTableRecord,
  BoardId extends HexBoardIdOfTable<NoInfer<Table>>,
  SpaceId extends HexSpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceId,
): Extract<
  Table["boards"]["byId"][BoardId],
  { layout: "hex" }
>["spaces"][SpaceId] {
  return getHexBoard(table, boardId).spaces[spaceId] as Extract<
    Table["boards"]["byId"][BoardId],
    { layout: "hex" }
  >["spaces"][SpaceId];
}

export function getSquareSpace<
  Table extends RuntimeTableRecord,
  BoardId extends SquareBoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SquareSpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceId,
): Extract<
  Table["boards"]["byId"][BoardId],
  { layout: "square" }
>["spaces"][SpaceId] {
  return getSquareBoard(table, boardId).spaces[spaceId] as Extract<
    Table["boards"]["byId"][BoardId],
    { layout: "square" }
  >["spaces"][SpaceId];
}

export function getContainer<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  ContainerId extends BoardContainerIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  containerId: ContainerId,
): Table["boards"]["byId"][BoardId]["containers"][ContainerId] {
  return getBoard(table, boardId).containers[
    containerId
  ] as Table["boards"]["byId"][BoardId]["containers"][ContainerId];
}

export function assertCardAllowedInContainer<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  ContainerId extends BoardContainerIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  containerId: ContainerId,
  componentId: string,
): void {
  const card = table.cards[componentId];
  if (!card) {
    return;
  }

  const allowedCardSetIds =
    getContainer(table, boardId, containerId).allowedCardSetIds ?? [];
  if (
    allowedCardSetIds.length > 0 &&
    !allowedCardSetIds.includes(card.cardSetId)
  ) {
    throw new Error(
      `Card '${componentId}' from card set '${card.cardSetId}' cannot enter container '${containerId}' on board '${boardId}'.`,
    );
  }
}

export function getEdge<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  EdgeId extends TiledEdgeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  edgeId: EdgeId,
): TiledEdgeStateOfTable<Table, BoardId, EdgeId> {
  const edge = getTiledBoard(table, boardId).edges.find(
    (candidate) => candidate.id === edgeId,
  );
  if (!edge) {
    throw new Error(`Unknown edge '${edgeId}' on board '${boardId}'.`);
  }
  return edge as TiledEdgeStateOfTable<Table, BoardId, EdgeId>;
}

export function getVertex<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  VertexId extends TiledVertexIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  vertexId: VertexId,
): TiledVertexStateOfTable<Table, BoardId, VertexId> {
  const vertex = getTiledBoard(table, boardId).vertices.find(
    (candidate) => candidate.id === vertexId,
  );
  if (!vertex) {
    throw new Error(`Unknown vertex '${vertexId}' on board '${boardId}'.`);
  }
  return vertex as TiledVertexStateOfTable<Table, BoardId, VertexId>;
}

export function getHexSpaceAt<
  Table extends RuntimeTableRecord,
  BoardId extends HexBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
  q: number,
  r: number,
):
  | Extract<
      Table["boards"]["byId"][BoardId],
      { layout: "hex" }
    >["spaces"][HexSpaceIdOfTable<NoInfer<Table>, BoardId>]
  | undefined {
  return Object.values(getHexBoard(table, boardId).spaces).find(
    (space) => space.q === q && space.r === r,
  ) as
    | Extract<
        Table["boards"]["byId"][BoardId],
        { layout: "hex" }
      >["spaces"][HexSpaceIdOfTable<NoInfer<Table>, BoardId>]
    | undefined;
}

export function getSquareSpaceAt<
  Table extends RuntimeTableRecord,
  BoardId extends SquareBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
  row: number,
  col: number,
):
  | Extract<
      Table["boards"]["byId"][BoardId],
      { layout: "square" }
    >["spaces"][SquareSpaceIdOfTable<NoInfer<Table>, BoardId>]
  | undefined {
  return Object.values(getSquareBoard(table, boardId).spaces).find(
    (space) => space.row === row && space.col === col,
  ) as
    | Extract<
        Table["boards"]["byId"][BoardId],
        { layout: "square" }
      >["spaces"][SquareSpaceIdOfTable<NoInfer<Table>, BoardId>]
    | undefined;
}

export function getSpaceEdges<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceIdOfTable<NoInfer<Table>, BoardId>,
): TiledEdgeIdOfTable<Table, BoardId>[] {
  return getTiledBoard(table, boardId)
    .edges.filter((edge) => edge.spaceIds.includes(spaceId))
    .map((edge) => edge.id as TiledEdgeIdOfTable<Table, BoardId>);
}

export function getSpaceVertices<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceIdOfTable<NoInfer<Table>, BoardId>,
): TiledVertexIdOfTable<Table, BoardId>[] {
  return getTiledBoard(table, boardId)
    .vertices.filter((vertex) => vertex.spaceIds.includes(spaceId))
    .map((vertex) => vertex.id as TiledVertexIdOfTable<Table, BoardId>);
}

export function getIncidentEdges<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  VertexId extends TiledVertexIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  vertexId: VertexId,
): TiledEdgeIdOfTable<Table, BoardId>[] {
  const tiledBoard = getTiledBoard(table, boardId);
  const vertex = tiledBoard.vertices.find(
    (candidate) => candidate.id === vertexId,
  );
  if (!vertex) {
    throw new Error(`Unknown vertex '${vertexId}' on board '${boardId}'.`);
  }
  const vertexSpaceIds = new Set(vertex.spaceIds);
  return tiledBoard.edges
    .filter((edge) =>
      edge.spaceIds.every((spaceId) => vertexSpaceIds.has(spaceId)),
    )
    .map((edge) => edge.id as TiledEdgeIdOfTable<Table, BoardId>);
}

export function getIncidentVertices<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  EdgeId extends TiledEdgeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  edgeId: EdgeId,
): TiledVertexIdOfTable<Table, BoardId>[] {
  const tiledBoard = getTiledBoard(table, boardId);
  const edge = tiledBoard.edges.find((candidate) => candidate.id === edgeId);
  if (!edge) {
    throw new Error(`Unknown edge '${edgeId}' on board '${boardId}'.`);
  }
  const edgeSpaceIds = new Set(edge.spaceIds);
  return tiledBoard.vertices
    .filter((vertex) =>
      Array.from(edgeSpaceIds).every((spaceId) =>
        vertex.spaceIds.includes(spaceId),
      ),
    )
    .map((vertex) => vertex.id as TiledVertexIdOfTable<Table, BoardId>);
}

export function getRelatedSpaces<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
  TypeId extends RelationTypeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceId,
  relationTypeId: TypeId,
): SpaceId[] {
  const board = getBoard(table, boardId);
  const related = new Set<SpaceId>();

  for (const relation of board.relations) {
    if (relation.typeId !== relationTypeId) {
      continue;
    }
    if (relation.fromSpaceId === spaceId) {
      related.add(relation.toSpaceId as SpaceId);
      continue;
    }
    if (!relation.directed && relation.toSpaceId === spaceId) {
      related.add(relation.fromSpaceId as SpaceId);
    }
  }

  return [...related];
}

export function getAdjacentSpaces<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
>(table: Table, boardId: BoardId, spaceId: SpaceId): SpaceId[] {
  return getRelatedSpaces(
    table,
    boardId,
    spaceId,
    "adjacent" as RelationTypeIdOfTable<NoInfer<Table>, BoardId>,
  );
}

export function getSpaceDistance<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  fromSpaceId: SpaceId,
  toSpaceId: SpaceId,
): number {
  if (fromSpaceId === toSpaceId) {
    return 0;
  }

  const visited = new Set<string>([fromSpaceId]);
  let frontier: string[] = [fromSpaceId];
  let distance = 0;

  while (frontier.length > 0) {
    distance += 1;
    const nextFrontier: string[] = [];

    for (const currentSpaceId of frontier) {
      for (const neighborId of getAdjacentSpaces(
        table,
        boardId,
        currentSpaceId as SpaceId,
      )) {
        if (neighborId === toSpaceId) {
          return distance;
        }
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          nextFrontier.push(neighborId);
        }
      }
    }

    frontier = nextFrontier;
  }

  return Number.POSITIVE_INFINITY;
}

export function getSquareNeighbors<
  Table extends RuntimeTableRecord,
  BoardId extends SquareBoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SquareSpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceId,
  options: { mode?: "orthogonal" | "diagonal" | "all" } = {},
): SquareSpaceIdOfTable<Table, BoardId>[] {
  const board = getSquareBoard(table, boardId);
  const space = getSquareSpace(table, boardId, spaceId);
  const offsets: ReadonlyArray<readonly [number, number]> =
    options.mode === "diagonal"
      ? [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ]
      : options.mode === "all"
        ? [
            [-1, 0],
            [0, 1],
            [1, 0],
            [0, -1],
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ]
        : [
            [-1, 0],
            [0, 1],
            [1, 0],
            [0, -1],
          ];

  return offsets
    .map(([rowOffset, colOffset]) =>
      Object.values(board.spaces).find(
        (candidate) =>
          candidate.row === space.row + rowOffset &&
          candidate.col === space.col + colOffset,
      ),
    )
    .filter((candidate): candidate is typeof space => candidate !== undefined)
    .map((candidate) => candidate.id as SquareSpaceIdOfTable<Table, BoardId>);
}

export function getSquareDistance<
  Table extends RuntimeTableRecord,
  BoardId extends SquareBoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SquareSpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  fromSpaceId: SpaceId,
  toSpaceId: SpaceId,
  options: { metric?: "manhattan" | "chebyshev" } = {},
): number {
  const from = getSquareSpace(table, boardId, fromSpaceId);
  const to = getSquareSpace(table, boardId, toSpaceId);
  const rowDistance = Math.abs(from.row - to.row);
  const colDistance = Math.abs(from.col - to.col);

  return options.metric === "chebyshev"
    ? Math.max(rowDistance, colDistance)
    : rowDistance + colDistance;
}

export function getBoardsByTypeId<
  Table extends RuntimeTableRecord,
  TypeId extends BoardTypeIdOfTable<NoInfer<Table>>,
>(table: Table, typeId: TypeId): BoardIdOfTable<Table>[] {
  return Object.entries(table.boards.byId)
    .filter(([, board]) => board.typeId === typeId)
    .map(([boardId]) => boardId as BoardIdOfTable<Table>);
}

export function getSpacesByTypeId<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  TypeId extends SpaceTypeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  typeId: TypeId,
): SpaceIdOfTable<Table, BoardId>[] {
  return Object.entries(getBoard(table, boardId).spaces)
    .filter(([, space]) => space.typeId === typeId)
    .map(([spaceId]) => spaceId as SpaceIdOfTable<Table, BoardId>);
}

export function getEdgesByTypeId<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  TypeId extends TiledEdgeTypeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  typeId: TypeId,
): TiledEdgeIdOfTable<Table, BoardId>[] {
  return getTiledBoard(table, boardId)
    .edges.filter((edge) => edge.typeId === typeId)
    .map((edge) => edge.id as TiledEdgeIdOfTable<Table, BoardId>);
}

export function getVerticesByTypeId<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  TypeId extends TiledVertexTypeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  typeId: TypeId,
): TiledVertexIdOfTable<Table, BoardId>[] {
  return getTiledBoard(table, boardId)
    .vertices.filter((vertex) => vertex.typeId === typeId)
    .map((vertex) => vertex.id as TiledVertexIdOfTable<Table, BoardId>);
}

export function getComponentsOnSpace<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceId,
): ComponentIdOfTable<Table>[] {
  const zoneId = getSpace(table, boardId, spaceId).zoneId;
  return orderedComponentIdsForLocation(
    table,
    (location) =>
      (location.type === "OnSpace" &&
        location.boardId === boardId &&
        location.spaceId === spaceId) ||
      (location.type === "InZone" &&
        typeof zoneId === "string" &&
        zoneId.length > 0 &&
        location.zoneId === zoneId),
  ) as ComponentIdOfTable<Table>[];
}

export function getComponentsInContainer<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  ContainerId extends BoardContainerIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  containerId: ContainerId,
): ComponentIdOfTable<Table>[] {
  const zoneId = getContainer(table, boardId, containerId).zoneId;
  return orderedComponentIdsForLocation(
    table,
    (location) =>
      (location.type === "InContainer" &&
        location.boardId === boardId &&
        location.containerId === containerId) ||
      (location.type === "InZone" &&
        typeof zoneId === "string" &&
        zoneId.length > 0 &&
        location.zoneId === zoneId),
  ) as ComponentIdOfTable<Table>[];
}

export function getComponentsOnEdge<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  EdgeId extends TiledEdgeIdOfTable<NoInfer<Table>, BoardId>,
>(table: Table, boardId: BoardId, edgeId: EdgeId): ComponentIdOfTable<Table>[] {
  return orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "OnEdge" &&
      location.boardId === boardId &&
      location.edgeId === edgeId,
  ) as ComponentIdOfTable<Table>[];
}

export function getComponentsOnVertex<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  VertexId extends TiledVertexIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  vertexId: VertexId,
): ComponentIdOfTable<Table>[] {
  return orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "OnVertex" &&
      location.boardId === boardId &&
      location.vertexId === vertexId,
  ) as ComponentIdOfTable<Table>[];
}

export function moveComponentToSpace<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  componentId: ComponentId,
  boardId: BoardId,
  spaceId: SpaceId,
): Table {
  const nextTable = cloneRuntimeTable(table);
  const position = getComponentsOnSpace(nextTable, boardId, spaceId).length;
  removeComponentFromCurrentLocation(nextTable, componentId);
  nextTable.componentLocations[componentId] = {
    type: "OnSpace",
    boardId,
    spaceId,
    position,
  };
  return nextTable;
}

export function moveComponentToContainer<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  ContainerId extends BoardContainerIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  componentId: ComponentId,
  boardId: BoardId,
  containerId: ContainerId,
): Table {
  const nextTable = cloneRuntimeTable(table);
  assertCardAllowedInContainer(nextTable, boardId, containerId, componentId);
  const position = getComponentsInContainer(
    nextTable,
    boardId,
    containerId,
  ).length;
  removeComponentFromCurrentLocation(nextTable, componentId);
  nextTable.componentLocations[componentId] = {
    type: "InContainer",
    boardId,
    containerId,
    position,
  };
  return nextTable;
}

export function moveComponentToDetached<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
>(table: Table, componentId: ComponentId): Table {
  const nextTable = cloneRuntimeTable(table);
  removeComponentFromCurrentLocation(nextTable, componentId);
  nextTable.componentLocations[componentId] = { type: "Detached" };
  return nextTable;
}

export function moveComponentToEdge<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  EdgeId extends TiledEdgeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  componentId: ComponentId,
  boardId: BoardId,
  edgeId: EdgeId,
): Table {
  const nextTable = cloneRuntimeTable(table);
  getEdge(nextTable, boardId, edgeId);
  const position = getComponentsOnEdge(nextTable, boardId, edgeId).length;
  removeComponentFromCurrentLocation(nextTable, componentId);
  nextTable.componentLocations[componentId] = {
    type: "OnEdge",
    boardId,
    edgeId,
    position,
  };
  return nextTable;
}

export function moveComponentToVertex<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  VertexId extends TiledVertexIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  componentId: ComponentId,
  boardId: BoardId,
  vertexId: VertexId,
): Table {
  const nextTable = cloneRuntimeTable(table);
  getVertex(nextTable, boardId, vertexId);
  const position = getComponentsOnVertex(nextTable, boardId, vertexId).length;
  removeComponentFromCurrentLocation(nextTable, componentId);
  nextTable.componentLocations[componentId] = {
    type: "OnVertex",
    boardId,
    vertexId,
    position,
  };
  return nextTable;
}

export function moveCardFromPlayerZoneToSharedZone<
  Table extends RuntimeTableRecord,
  HandId extends PlayerZoneIdOfTable<Table>,
  PlayerId extends PlayerIdOfTable<Table>,
  DeckId extends SharedZoneIdOfTable<Table>,
>(options: {
  table: Table;
  playerId: PlayerId;
  fromZoneId: HandId;
  toZoneId: DeckId;
  cardId: CompatibleCardIdForHandAndDeck<Table, HandId, DeckId>;
  playedBy?: PlayerIdOfTable<Table> | null;
  position?: "top" | "bottom";
}): Table {
  return moveFromHandToDeck({
    table: options.table,
    playerId: options.playerId,
    handId: options.fromZoneId,
    cardId: options.cardId,
    deckId: options.toZoneId,
    playedBy: options.playedBy,
    position: options.position,
  });
}

/**
 * Move a named card from a shared zone (supply pile, deck) to a perPlayer zone
 * (e.g. discard, hand, in-play). Use this for the "gain" verb — distinct from
 * `dealCardsToPlayerZone`, which draws an unspecified count of top cards from
 * a deck. Owner flips to the receiving player; visibility is recomputed from
 * the destination zone's `handVisibility` mode.
 */
/**
 * Move the top `count` cards from one perPlayer zone to another for the same
 * player. Companion to {@link dealCardsFromDeckToHand} for the perPlayer →
 * perPlayer case (most importantly, "draw N from your deck to your hand"
 * in deck-builders). Visibility is recomputed for the destination; owner is
 * preserved.
 */
export function dealCardsBetweenPlayerZones<
  Table extends RuntimeTableRecord,
  FromZoneId extends PlayerZoneIdOfTable<Table>,
  ToZoneId extends PlayerZoneIdOfTable<Table>,
  PlayerId extends PlayerIdOfTable<Table>,
>(options: {
  table: Table;
  playerId: PlayerId;
  fromZoneId: FromZoneId;
  toZoneId: ToZoneId;
  count: number;
}): Table {
  let nextTable = options.table;
  for (let i = 0; i < options.count; i += 1) {
    const sourceCards = ensureArray(
      ppRead(
        nextTable.zones.perPlayer[options.fromZoneId] ??
          nextTable.hands[options.fromZoneId],
        options.playerId as string,
      ) as readonly string[] | undefined,
    );
    const topCardId = sourceCards[0];
    if (topCardId === undefined) {
      break;
    }
    nextTable = moveCardBetweenPlayerZones({
      table: nextTable,
      playerId: options.playerId,
      fromZoneId: options.fromZoneId,
      toZoneId: options.toZoneId,
      cardId: topCardId as CompatibleCardIdForTwoPlayerZones<
        Table,
        FromZoneId,
        ToZoneId
      >,
    });
  }
  return nextTable;
}

export function moveCardFromSharedZoneToPlayerZone<
  Table extends RuntimeTableRecord,
  FromZoneId extends SharedZoneIdOfTable<Table>,
  ToZoneId extends PlayerZoneIdOfTable<Table>,
  PlayerId extends PlayerIdOfTable<Table>,
>(options: {
  table: Table;
  playerId: PlayerId;
  fromZoneId: FromZoneId;
  toZoneId: ToZoneId;
  cardId: CompatibleCardIdForHandAndDeck<Table, ToZoneId, FromZoneId>;
  position?: "top" | "bottom";
}): Table {
  const nextTable = cloneRuntimeTable(options.table);
  assertZoneScope(
    nextTable,
    options.fromZoneId as string,
    "shared",
    "moveCardFromSharedZoneToPlayerZone",
    "fromZoneId",
  );
  assertZoneScope(
    nextTable,
    options.toZoneId as string,
    "perPlayer",
    "moveCardFromSharedZoneToPlayerZone",
    "toZoneId",
  );

  const sourceCards = ensureArray(
    nextTable.zones.shared[options.fromZoneId] ??
      nextTable.decks[options.fromZoneId],
  );
  if (!sourceCards.includes(options.cardId as string)) {
    throw new Error(
      `Card '${String(options.cardId)}' is not in shared zone '${String(
        options.fromZoneId,
      )}'.`,
    );
  }
  assertCardAllowedInZone(
    nextTable,
    options.toZoneId as string,
    options.cardId as string,
  );

  const remainingSource = sourceCards.filter(
    (candidate) => candidate !== options.cardId,
  );
  syncSharedZoneWithDeck(nextTable, options.fromZoneId, remainingSource);
  for (const [index, currentCardId] of remainingSource.entries()) {
    const existing = nextTable.componentLocations[currentCardId];
    if (existing?.type === "InDeck") {
      nextTable.componentLocations[currentCardId] = {
        ...existing,
        position: index,
      };
    }
  }

  const destinationCards = ensureArray(
    ppRead(
      nextTable.zones.perPlayer[options.toZoneId] ??
        nextTable.hands[options.toZoneId],
      options.playerId as string,
    ) as readonly string[] | undefined,
  );
  const nextDestination =
    options.position === "top"
      ? [options.cardId as string, ...destinationCards]
      : [...destinationCards, options.cardId as string];
  syncPlayerZoneWithHand(
    nextTable,
    options.toZoneId,
    options.playerId,
    nextDestination,
  );
  for (const [index, currentCardId] of nextDestination.entries()) {
    nextTable.componentLocations[currentCardId] = {
      type: "InHand",
      handId: options.toZoneId as string,
      playerId: options.playerId as string,
      position: index,
    };
  }
  nextTable.ownerOfCard[options.cardId as string] = options.playerId as string;
  nextTable.visibility[options.cardId as string] =
    computeVisibilityForPlayerZone(
      nextTable,
      options.toZoneId as string,
      options.playerId as string,
    );

  return nextTable;
}

/**
 * Move a card between two perPlayer zones owned by the same player. Use this
 * for hand → in-play, in-play → discard, and similar same-player transitions
 * that do not change ownership. Owner is preserved; visibility is recomputed
 * from the destination zone's `handVisibility` mode.
 */
export function moveCardBetweenPlayerZones<
  Table extends RuntimeTableRecord,
  FromZoneId extends PlayerZoneIdOfTable<Table>,
  ToZoneId extends PlayerZoneIdOfTable<Table>,
  PlayerId extends PlayerIdOfTable<Table>,
>(options: {
  table: Table;
  playerId: PlayerId;
  fromZoneId: FromZoneId;
  toZoneId: ToZoneId;
  cardId: CompatibleCardIdForTwoPlayerZones<Table, FromZoneId, ToZoneId>;
  position?: "top" | "bottom";
}): Table {
  const nextTable = cloneRuntimeTable(options.table);
  assertZoneScope(
    nextTable,
    options.fromZoneId as string,
    "perPlayer",
    "moveCardBetweenPlayerZones",
    "fromZoneId",
  );
  assertZoneScope(
    nextTable,
    options.toZoneId as string,
    "perPlayer",
    "moveCardBetweenPlayerZones",
    "toZoneId",
  );

  const sourceCards = ensureArray(
    ppRead(
      nextTable.zones.perPlayer[options.fromZoneId] ??
        nextTable.hands[options.fromZoneId],
      options.playerId as string,
    ) as readonly string[] | undefined,
  );
  if (!sourceCards.includes(options.cardId as string)) {
    throw new Error(
      `Card '${String(options.cardId)}' is not in zone '${String(
        options.fromZoneId,
      )}' for player '${String(options.playerId)}'.`,
    );
  }
  assertCardAllowedInZone(
    nextTable,
    options.toZoneId as string,
    options.cardId as string,
  );

  const remainingSource = sourceCards.filter(
    (candidate) => candidate !== options.cardId,
  );
  syncPlayerZoneWithHand(
    nextTable,
    options.fromZoneId,
    options.playerId,
    remainingSource,
  );
  for (const [index, currentCardId] of remainingSource.entries()) {
    const existing = nextTable.componentLocations[currentCardId];
    if (existing?.type === "InHand") {
      nextTable.componentLocations[currentCardId] = {
        ...existing,
        position: index,
      };
    }
  }

  const destinationCards = ensureArray(
    ppRead(
      nextTable.zones.perPlayer[options.toZoneId] ??
        nextTable.hands[options.toZoneId],
      options.playerId as string,
    ) as readonly string[] | undefined,
  );
  const nextDestination =
    options.position === "top"
      ? [options.cardId as string, ...destinationCards]
      : [...destinationCards, options.cardId as string];
  syncPlayerZoneWithHand(
    nextTable,
    options.toZoneId,
    options.playerId,
    nextDestination,
  );
  for (const [index, currentCardId] of nextDestination.entries()) {
    nextTable.componentLocations[currentCardId] = {
      type: "InHand",
      handId: options.toZoneId as string,
      playerId: options.playerId as string,
      position: index,
    };
  }
  nextTable.visibility[options.cardId as string] =
    computeVisibilityForPlayerZone(
      nextTable,
      options.toZoneId as string,
      options.playerId as string,
    );

  return nextTable;
}

export function moveCardBetweenSharedZones<
  Table extends RuntimeTableRecord,
  FromZoneId extends SharedZoneIdOfTable<Table>,
  ToZoneId extends SharedZoneIdOfTable<Table>,
>(options: {
  table: Table;
  fromZoneId: FromZoneId;
  toZoneId: ToZoneId;
  cardId: DeckCardsOfTable<Table, FromZoneId>[number];
  playedBy?: PlayerIdOfTable<Table> | null;
  position?: "top" | "bottom";
}): Table {
  const removed = removeFromDeck(
    options.table,
    options.fromZoneId,
    options.cardId,
  );
  return appendToDeck(
    removed,
    options.toZoneId,
    options.cardId as DeckCardsOfTable<Table, ToZoneId>[number],
    options.playedBy ?? null,
    options.position ?? "bottom",
  );
}

export function removeCardFromSharedZone<
  Table extends RuntimeTableRecord,
  DeckId extends DeckIdOfTable<Table>,
>(
  table: Table,
  deckId: DeckId,
  cardId: DeckCardsOfTable<Table, DeckId>[number],
): Table {
  return removeFromDeck(table, deckId, cardId);
}

export function addCardToSharedZone<
  Table extends RuntimeTableRecord,
  DeckId extends DeckIdOfTable<Table>,
>(
  table: Table,
  deckId: DeckId,
  cardId: DeckCardsOfTable<Table, DeckId>[number],
  playedBy: PlayerIdOfTable<Table> | null = null,
  position: "top" | "bottom" = "bottom",
): Table {
  return appendToDeck(table, deckId, cardId, playedBy, position);
}

/**
 * Deterministically draw the top `count` cards from a shared deck and deal
 * them into a player's hand zone. No RNG is consumed — call
 * {@link shuffleSharedZone} (via `fx.shuffleSharedZone`) first if the deck
 * needs randomising.
 */
export function dealCardsFromDeckToHand<
  Table extends RuntimeTableRecord,
  DeckId extends DeckIdOfTable<Table>,
  PlayerId extends PlayerIdOfTable<Table>,
  HandId extends HandIdOfTable<Table>,
>(
  table: Table,
  fromZoneId: DeckId,
  playerId: PlayerId,
  toZoneId: HandId,
  count: number,
): Table {
  const nextTable = cloneRuntimeTable(table);
  const publicHands = new Set(
    Object.entries(nextTable.handVisibility)
      .filter(([, mode]) => mode === "all" || mode === "public")
      .map(([handId]) => handId),
  );

  for (let index = 0; index < count; index += 1) {
    const nextCard = ensureArray(nextTable.decks[fromZoneId])[0];
    if (!nextCard) {
      break;
    }
    nextTable.decks[fromZoneId] = ensureArray(
      nextTable.decks[fromZoneId],
    ).slice(1) as (typeof nextTable.decks)[DeckId];
    nextTable.zones.shared[fromZoneId] = [
      ...ensureArray(nextTable.decks[fromZoneId]),
    ] as (typeof nextTable.zones.shared)[DeckId];
    const prevHand = ppRead(nextTable.hands[toZoneId], playerId as string) as
      | readonly string[]
      | undefined;
    const nextHand = [...ensureArray(prevHand), nextCard];
    assertCardAllowedInZone(nextTable, toZoneId, nextCard);
    nextTable.hands[toZoneId] = ppWrite(
      nextTable.hands[toZoneId],
      playerId as string,
      nextHand,
    ) as (typeof nextTable.hands)[HandId];
    nextTable.zones.perPlayer[toZoneId] = ppWrite(
      nextTable.zones.perPlayer[toZoneId],
      playerId as string,
      [...nextHand],
    ) as (typeof nextTable.zones.perPlayer)[HandId];
    nextTable.componentLocations[nextCard] = {
      type: "InHand",
      handId: toZoneId,
      playerId,
      position: nextHand.length - 1,
    };
    nextTable.ownerOfCard[nextCard] = playerId;
    nextTable.visibility[nextCard] = publicHands.has(toZoneId as string)
      ? {
          faceUp: true,
        }
      : {
          faceUp: false,
          visibleTo: [playerId],
        };
  }
  return nextTable;
}

export type { RuntimeTableRecord, TableOfState, CardIdOfState };
