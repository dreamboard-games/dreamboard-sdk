import type {
  CompatibleCardIdForHandAndDeck,
  CompatibleCardIdForTwoPlayerZones,
  DeckCardsOfTable,
  DeckIdOfTable,
  HandIdOfTable,
  PlayerIdOfTable,
  PlayerZoneIdOfTable,
  RuntimeTableRecord,
  SharedZoneIdOfTable,
} from "../model";
import { assertCardAllowedInZone } from "./card-validation";
import {
  assertZoneScope,
  ensureArray,
  syncPlayerZoneWithHand,
  syncSharedZoneWithDeck,
} from "./internal";
import { assertNonNegativeSafeInteger } from "./numeric";

function sharedZoneCards<Table extends RuntimeTableRecord>(
  table: Table,
  zoneId: string,
): string[] {
  return [...ensureArray(table.zones.shared[zoneId] ?? table.decks[zoneId])];
}

function playerZoneCards<Table extends RuntimeTableRecord>(
  table: Table,
  zoneId: string,
  playerId: string,
): string[] {
  return [
    ...ensureArray(
      (table.zones.perPlayer[zoneId] ?? table.hands[zoneId])?.[playerId],
    ),
  ];
}

function assertCardInSharedZone(
  table: RuntimeTableRecord,
  zoneId: string,
  cardId: string,
): void {
  if (!sharedZoneCards(table, zoneId).includes(cardId)) {
    throw new Error(`Card '${cardId}' is not in shared zone '${zoneId}'.`);
  }

  const location = table.componentLocations[cardId];
  if (location?.type !== "InDeck" || location.deckId !== zoneId) {
    throw new Error(
      `Card '${cardId}' has a location that disagrees with shared zone '${zoneId}'.`,
    );
  }
}

function assertCardInPlayerZone(
  table: RuntimeTableRecord,
  zoneId: string,
  playerId: string,
  cardId: string,
): void {
  if (!playerZoneCards(table, zoneId, playerId).includes(cardId)) {
    throw new Error(
      `Card '${cardId}' is not in zone '${zoneId}' for player '${playerId}'.`,
    );
  }

  const location = table.componentLocations[cardId];
  if (
    location?.type !== "InHand" ||
    location.handId !== zoneId ||
    location.playerId !== playerId
  ) {
    throw new Error(
      `Card '${cardId}' has a location that disagrees with zone '${zoneId}' for player '${playerId}'.`,
    );
  }
}

function assertCardDetached(table: RuntimeTableRecord, cardId: string): void {
  const location = table.componentLocations[cardId];
  if (location?.type !== "Detached") {
    throw new Error(`Card '${cardId}' must be detached before placement.`);
  }
}

function assertCardAbsentFromSharedZone(
  table: RuntimeTableRecord,
  zoneId: string,
  cardId: string,
): void {
  if (sharedZoneCards(table, zoneId).includes(cardId)) {
    throw new Error(`Card '${cardId}' is already in shared zone '${zoneId}'.`);
  }
}

function assertCardAbsentFromPlayerZone(
  table: RuntimeTableRecord,
  zoneId: string,
  playerId: string,
  cardId: string,
): void {
  if (playerZoneCards(table, zoneId, playerId).includes(cardId)) {
    throw new Error(
      `Card '${cardId}' is already in zone '${zoneId}' for player '${playerId}'.`,
    );
  }
}

function reindexSharedZoneCards(
  table: RuntimeTableRecord,
  zoneId: string,
  cardIds: readonly string[],
  playedByForCard?: Readonly<Record<string, string | null>>,
): void {
  for (const [index, currentCardId] of cardIds.entries()) {
    const existing = table.componentLocations[currentCardId];
    table.componentLocations[currentCardId] = {
      type: "InDeck",
      deckId: zoneId,
      playedBy:
        playedByForCard?.[currentCardId] ??
        (existing?.type === "InDeck" ? existing.playedBy : null),
      position: index,
    };
  }
}

function reindexPlayerZoneCards(
  table: RuntimeTableRecord,
  zoneId: string,
  playerId: string,
  cardIds: readonly string[],
): void {
  for (const [index, currentCardId] of cardIds.entries()) {
    table.componentLocations[currentCardId] = {
      type: "InHand",
      handId: zoneId,
      playerId,
      position: index,
    };
  }
}

function insertCard(
  cardIds: readonly string[],
  cardId: string,
  position: "top" | "bottom" = "bottom",
): string[] {
  return position === "top" ? [cardId, ...cardIds] : [...cardIds, cardId];
}

function removeCard(cardIds: readonly string[], cardId: string): string[] {
  return cardIds.filter((candidate) => candidate !== cardId);
}

function appendCardToSharedZoneCollectionInPlace<
  Table extends RuntimeTableRecord,
  DeckId extends DeckIdOfTable<Table>,
>(
  table: Table,
  deckId: DeckId,
  cardId: string,
  playedBy: string | null,
  position: "top" | "bottom" = "bottom",
): void {
  const nextCards = insertCard(
    sharedZoneCards(table, deckId),
    cardId,
    position,
  );
  syncSharedZoneWithDeck(
    table,
    deckId,
    nextCards as DeckCardsOfTable<Table, DeckId>,
  );
  reindexSharedZoneCards(table, deckId, nextCards, {
    [cardId]: playedBy,
  });
}

function removeCardFromSharedZoneCollectionInPlace<
  Table extends RuntimeTableRecord,
  DeckId extends DeckIdOfTable<Table>,
>(table: Table, deckId: DeckId, cardId: string): void {
  const remaining = removeCard(sharedZoneCards(table, deckId), cardId);
  syncSharedZoneWithDeck(
    table,
    deckId,
    remaining as DeckCardsOfTable<Table, DeckId>,
  );
  reindexSharedZoneCards(table, deckId, remaining);
}

function setPlayerZoneCardsInPlace<
  Table extends RuntimeTableRecord,
  ZoneId extends PlayerZoneIdOfTable<Table> | HandIdOfTable<Table>,
  PlayerId extends PlayerIdOfTable<Table>,
>(
  table: Table,
  zoneId: ZoneId,
  playerId: PlayerId,
  cardIds: readonly string[],
): void {
  syncPlayerZoneWithHand(table, zoneId, playerId, cardIds);
  reindexPlayerZoneCards(table, zoneId, playerId, cardIds);
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
    const fromZone = (table.zones.perPlayer[zoneId] ?? table.hands[zoneId])?.[
      playerId
    ];
    return [...ensureArray(fromZone)];
  }
  table.hands[zoneId] = {
    ...table.hands[zoneId],
    [playerId]: [...nextCards],
  };
  table.zones.perPlayer[zoneId] = {
    ...table.zones.perPlayer[zoneId],
    [playerId]: [...nextCards],
  };
  return [...nextCards];
}

export function appendToDeckInPlace<
  Table extends RuntimeTableRecord,
  DeckId extends DeckIdOfTable<Table>,
>(
  table: Table,
  deckId: DeckId,
  cardId: DeckCardsOfTable<Table, DeckId>[number],
  playedBy: PlayerIdOfTable<Table> | null = null,
  position: "top" | "bottom" = "bottom",
): void {
  assertZoneScope(table, deckId, "shared", "addCardToSharedZone", "zoneId");
  assertCardDetached(table, cardId);
  assertCardAbsentFromSharedZone(table, deckId, cardId);
  assertCardAllowedInZone(table, deckId, cardId);
  appendCardToSharedZoneCollectionInPlace(
    table,
    deckId,
    cardId,
    playedBy,
    position,
  );
  table.ownerOfCard[cardId] = playedBy;
  table.visibility[cardId] = {
    faceUp: true,
  };
}

export function removeFromDeckInPlace<
  Table extends RuntimeTableRecord,
  DeckId extends DeckIdOfTable<Table>,
>(
  table: Table,
  deckId: DeckId,
  cardId: DeckCardsOfTable<Table, DeckId>[number],
): void {
  assertZoneScope(
    table,
    deckId,
    "shared",
    "removeCardFromSharedZone",
    "zoneId",
  );
  assertCardInSharedZone(table, deckId, cardId);
  removeCardFromSharedZoneCollectionInPlace(table, deckId, cardId);
  table.componentLocations[cardId] = { type: "Detached" };
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

function moveFromHandToDeckInPlace<
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
}): void {
  assertZoneScope(
    options.table,
    options.handId,
    "perPlayer",
    "moveCardFromPlayerZoneToSharedZone",
    "fromZoneId",
  );
  assertZoneScope(
    options.table,
    options.deckId,
    "shared",
    "moveCardFromPlayerZoneToSharedZone",
    "toZoneId",
  );
  assertCardInPlayerZone(
    options.table,
    options.handId,
    options.playerId,
    options.cardId,
  );
  assertCardAbsentFromSharedZone(options.table, options.deckId, options.cardId);
  assertCardAllowedInZone(options.table, options.deckId, options.cardId);

  const currentHand = playerZoneCards(
    options.table,
    options.handId,
    options.playerId,
  );
  const nextHand = removeCard(currentHand, options.cardId);
  setPlayerZoneCardsInPlace(
    options.table,
    options.handId,
    options.playerId,
    nextHand,
  );
  appendCardToSharedZoneCollectionInPlace(
    options.table,
    options.deckId,
    options.cardId,
    options.playedBy ?? options.playerId,
    options.position ?? "bottom",
  );
  options.table.ownerOfCard[options.cardId] =
    options.playedBy ?? options.playerId;
  options.table.visibility[options.cardId] = {
    faceUp: true,
  };
}

export function moveCardFromPlayerZoneToSharedZoneInPlace<
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
}): void {
  moveFromHandToDeckInPlace({
    table: options.table,
    playerId: options.playerId,
    handId: options.fromZoneId,
    cardId: options.cardId,
    deckId: options.toZoneId,
    playedBy: options.playedBy,
    position: options.position,
  });
}

export function dealCardsBetweenPlayerZonesInPlace<
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
}): void {
  assertNonNegativeSafeInteger(options.count, "Deal count");
  if (options.count === 0) return;
  assertZoneScope(
    options.table,
    options.fromZoneId,
    "perPlayer",
    "dealCardsBetweenPlayerZones",
    "fromZoneId",
  );
  assertZoneScope(
    options.table,
    options.toZoneId,
    "perPlayer",
    "dealCardsBetweenPlayerZones",
    "toZoneId",
  );
  const fromZoneId: string = options.fromZoneId;
  if (fromZoneId === options.toZoneId) {
    throw new Error("Deal source and destination must differ.");
  }

  const sourceCards = playerZoneCards(
    options.table,
    options.fromZoneId,
    options.playerId,
  );
  const selectedCards = sourceCards.slice(0, options.count);
  const destinationCards = playerZoneCards(
    options.table,
    options.toZoneId,
    options.playerId,
  );
  for (const cardId of selectedCards) {
    assertCardInPlayerZone(
      options.table,
      options.fromZoneId,
      options.playerId,
      cardId,
    );
    assertCardAbsentFromPlayerZone(
      options.table,
      options.toZoneId,
      options.playerId,
      cardId,
    );
    assertCardAllowedInZone(options.table, options.toZoneId, cardId);
  }

  const remainingSource = sourceCards.slice(selectedCards.length);
  const nextDestination = [...destinationCards, ...selectedCards];
  setPlayerZoneCardsInPlace(
    options.table,
    options.fromZoneId,
    options.playerId,
    remainingSource,
  );
  setPlayerZoneCardsInPlace(
    options.table,
    options.toZoneId,
    options.playerId,
    nextDestination,
  );
  for (const cardId of selectedCards) {
    options.table.visibility[cardId] = computeVisibilityForPlayerZone(
      options.table,
      options.toZoneId,
      options.playerId,
    );
  }
}

export function moveCardFromSharedZoneToPlayerZoneInPlace<
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
}): void {
  assertZoneScope(
    options.table,
    options.fromZoneId,
    "shared",
    "moveCardFromSharedZoneToPlayerZone",
    "fromZoneId",
  );
  assertZoneScope(
    options.table,
    options.toZoneId,
    "perPlayer",
    "moveCardFromSharedZoneToPlayerZone",
    "toZoneId",
  );

  assertCardInSharedZone(options.table, options.fromZoneId, options.cardId);
  assertCardAbsentFromPlayerZone(
    options.table,
    options.toZoneId,
    options.playerId,
    options.cardId,
  );
  assertCardAllowedInZone(options.table, options.toZoneId, options.cardId);

  const destinationCards = playerZoneCards(
    options.table,
    options.toZoneId,
    options.playerId,
  );
  const nextDestination = insertCard(
    destinationCards,
    options.cardId,
    options.position ?? "bottom",
  );
  removeCardFromSharedZoneCollectionInPlace(
    options.table,
    options.fromZoneId,
    options.cardId,
  );
  setPlayerZoneCardsInPlace(
    options.table,
    options.toZoneId,
    options.playerId,
    nextDestination,
  );
  options.table.ownerOfCard[options.cardId] = options.playerId;
  options.table.visibility[options.cardId] = computeVisibilityForPlayerZone(
    options.table,
    options.toZoneId,
    options.playerId,
  );
}

export function moveCardBetweenPlayerZonesInPlace<
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
}): void {
  assertZoneScope(
    options.table,
    options.fromZoneId,
    "perPlayer",
    "moveCardBetweenPlayerZones",
    "fromZoneId",
  );
  assertZoneScope(
    options.table,
    options.toZoneId,
    "perPlayer",
    "moveCardBetweenPlayerZones",
    "toZoneId",
  );

  assertCardInPlayerZone(
    options.table,
    options.fromZoneId,
    options.playerId,
    options.cardId,
  );
  assertCardAbsentFromPlayerZone(
    options.table,
    options.toZoneId,
    options.playerId,
    options.cardId,
  );
  assertCardAllowedInZone(options.table, options.toZoneId, options.cardId);

  const sourceCards = playerZoneCards(
    options.table,
    options.fromZoneId,
    options.playerId,
  );
  const destinationCards = playerZoneCards(
    options.table,
    options.toZoneId,
    options.playerId,
  );
  const remainingSource = removeCard(sourceCards, options.cardId);
  const nextDestination = insertCard(
    destinationCards,
    options.cardId,
    options.position ?? "bottom",
  );
  setPlayerZoneCardsInPlace(
    options.table,
    options.fromZoneId,
    options.playerId,
    remainingSource,
  );
  setPlayerZoneCardsInPlace(
    options.table,
    options.toZoneId,
    options.playerId,
    nextDestination,
  );
  options.table.visibility[options.cardId] = computeVisibilityForPlayerZone(
    options.table,
    options.toZoneId,
    options.playerId,
  );
}

export function moveCardBetweenSharedZonesInPlace<
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
}): void {
  assertZoneScope(
    options.table,
    options.fromZoneId,
    "shared",
    "moveCardBetweenSharedZones",
    "fromZoneId",
  );
  assertZoneScope(
    options.table,
    options.toZoneId,
    "shared",
    "moveCardBetweenSharedZones",
    "toZoneId",
  );
  assertCardInSharedZone(options.table, options.fromZoneId, options.cardId);
  assertCardAbsentFromSharedZone(
    options.table,
    options.toZoneId,
    options.cardId,
  );
  assertCardAllowedInZone(options.table, options.toZoneId, options.cardId);

  removeCardFromSharedZoneCollectionInPlace(
    options.table,
    options.fromZoneId,
    options.cardId,
  );
  appendCardToSharedZoneCollectionInPlace(
    options.table,
    options.toZoneId,
    options.cardId,
    options.playedBy ?? null,
    options.position ?? "bottom",
  );
  options.table.ownerOfCard[options.cardId] = options.playedBy ?? null;
  options.table.visibility[options.cardId] = {
    faceUp: true,
  };
}

export function removeCardFromSharedZoneInPlace<
  Table extends RuntimeTableRecord,
  DeckId extends DeckIdOfTable<Table>,
>(
  table: Table,
  deckId: DeckId,
  cardId: DeckCardsOfTable<Table, DeckId>[number],
): void {
  removeFromDeckInPlace(table, deckId, cardId);
}

export function addCardToSharedZoneInPlace<
  Table extends RuntimeTableRecord,
  DeckId extends DeckIdOfTable<Table>,
>(
  table: Table,
  deckId: DeckId,
  cardId: DeckCardsOfTable<Table, DeckId>[number],
  playedBy: PlayerIdOfTable<Table> | null = null,
  position: "top" | "bottom" = "bottom",
): void {
  appendToDeckInPlace(table, deckId, cardId, playedBy, position);
}

export function dealCardsFromDeckToHandInPlace<
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
): void {
  assertNonNegativeSafeInteger(count, "Deal count");
  if (count === 0) return;
  assertZoneScope(
    table,
    fromZoneId,
    "shared",
    "dealCardsFromDeckToHand",
    "fromZoneId",
  );
  assertZoneScope(
    table,
    toZoneId,
    "perPlayer",
    "dealCardsFromDeckToHand",
    "toZoneId",
  );

  const sourceCards = sharedZoneCards(table, fromZoneId);
  const selectedCards = sourceCards.slice(0, count);
  const destinationCards = playerZoneCards(table, toZoneId, playerId);

  for (const cardId of selectedCards) {
    assertCardInSharedZone(table, fromZoneId, cardId);
    assertCardAbsentFromPlayerZone(table, toZoneId, playerId, cardId);
    assertCardAllowedInZone(table, toZoneId, cardId);
  }

  const remainingSource = sourceCards.slice(selectedCards.length);
  const nextHand = [...destinationCards, ...selectedCards];
  syncSharedZoneWithDeck(
    table,
    fromZoneId,
    remainingSource as DeckCardsOfTable<Table, DeckId>,
  );
  reindexSharedZoneCards(table, fromZoneId, remainingSource);
  setPlayerZoneCardsInPlace(table, toZoneId, playerId, nextHand);

  for (const cardId of selectedCards) {
    table.ownerOfCard[cardId] = playerId;
    table.visibility[cardId] = computeVisibilityForPlayerZone(
      table,
      toZoneId,
      playerId,
    );
  }
}
