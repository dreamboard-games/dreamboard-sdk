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
import { cloneRuntimeTable } from "./clone";
import {
  assertZoneScope,
  ensureArray,
  ppRead,
  ppWrite,
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
      ppRead(table.zones.perPlayer[zoneId] ?? table.hands[zoneId], playerId) as
        | readonly string[]
        | undefined,
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
    sharedZoneCards(table, deckId as string),
    cardId,
    position,
  );
  syncSharedZoneWithDeck(
    table,
    deckId,
    nextCards as DeckCardsOfTable<Table, DeckId>,
  );
  reindexSharedZoneCards(table, deckId as string, nextCards, {
    [cardId]: playedBy,
  });
}

function removeCardFromSharedZoneCollectionInPlace<
  Table extends RuntimeTableRecord,
  DeckId extends DeckIdOfTable<Table>,
>(table: Table, deckId: DeckId, cardId: string): void {
  const remaining = removeCard(
    sharedZoneCards(table, deckId as string),
    cardId,
  );
  syncSharedZoneWithDeck(
    table,
    deckId,
    remaining as DeckCardsOfTable<Table, DeckId>,
  );
  reindexSharedZoneCards(table, deckId as string, remaining);
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
  reindexPlayerZoneCards(table, zoneId as string, playerId as string, cardIds);
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
  appendToDeckInPlace(nextTable, deckId, cardId, playedBy, position);
  return nextTable;
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
  assertZoneScope(
    table,
    deckId as string,
    "shared",
    "addCardToSharedZone",
    "zoneId",
  );
  assertCardDetached(table, cardId as string);
  assertCardAbsentFromSharedZone(table, deckId as string, cardId as string);
  assertCardAllowedInZone(table, deckId, cardId);
  appendCardToSharedZoneCollectionInPlace(
    table,
    deckId,
    cardId as string,
    playedBy as string | null,
    position,
  );
  table.ownerOfCard[cardId] = playedBy;
  table.visibility[cardId] = {
    faceUp: true,
  };
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
  removeFromDeckInPlace(nextTable, deckId, cardId);
  return nextTable;
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
    deckId as string,
    "shared",
    "removeCardFromSharedZone",
    "zoneId",
  );
  assertCardInSharedZone(table, deckId as string, cardId as string);
  removeCardFromSharedZoneCollectionInPlace(table, deckId, cardId as string);
  table.componentLocations[cardId as string] = { type: "Detached" };
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
  moveFromHandToDeckInPlace({
    ...options,
    table: nextTable,
  });
  return nextTable;
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
    options.handId as string,
    "perPlayer",
    "moveCardFromPlayerZoneToSharedZone",
    "fromZoneId",
  );
  assertZoneScope(
    options.table,
    options.deckId as string,
    "shared",
    "moveCardFromPlayerZoneToSharedZone",
    "toZoneId",
  );
  assertCardInPlayerZone(
    options.table,
    options.handId as string,
    options.playerId as string,
    options.cardId as string,
  );
  assertCardAbsentFromSharedZone(
    options.table,
    options.deckId as string,
    options.cardId as string,
  );
  assertCardAllowedInZone(
    options.table,
    options.deckId as string,
    options.cardId as string,
  );

  const currentHand = playerZoneCards(
    options.table,
    options.handId as string,
    options.playerId as string,
  );
  const nextHand = removeCard(currentHand, options.cardId as string);
  setPlayerZoneCardsInPlace(
    options.table,
    options.handId,
    options.playerId,
    nextHand,
  );
  appendCardToSharedZoneCollectionInPlace(
    options.table,
    options.deckId,
    options.cardId as string,
    (options.playedBy ?? options.playerId) as string | null,
    options.position ?? "bottom",
  );
  options.table.ownerOfCard[options.cardId] =
    options.playedBy ?? options.playerId;
  options.table.visibility[options.cardId] = {
    faceUp: true,
  };
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
  const nextTable = cloneRuntimeTable(options.table);
  dealCardsBetweenPlayerZonesInPlace({
    ...options,
    table: nextTable,
  });
  return nextTable;
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
    options.fromZoneId as string,
    "perPlayer",
    "dealCardsBetweenPlayerZones",
    "fromZoneId",
  );
  assertZoneScope(
    options.table,
    options.toZoneId as string,
    "perPlayer",
    "dealCardsBetweenPlayerZones",
    "toZoneId",
  );
  if ((options.fromZoneId as string) === (options.toZoneId as string)) {
    throw new Error("Deal source and destination must differ.");
  }

  const sourceCards = playerZoneCards(
    options.table,
    options.fromZoneId as string,
    options.playerId as string,
  );
  const selectedCards = sourceCards.slice(0, options.count);
  const destinationCards = playerZoneCards(
    options.table,
    options.toZoneId as string,
    options.playerId as string,
  );
  for (const cardId of selectedCards) {
    assertCardInPlayerZone(
      options.table,
      options.fromZoneId as string,
      options.playerId as string,
      cardId,
    );
    assertCardAbsentFromPlayerZone(
      options.table,
      options.toZoneId as string,
      options.playerId as string,
      cardId,
    );
    assertCardAllowedInZone(options.table, options.toZoneId as string, cardId);
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
      options.toZoneId as string,
      options.playerId as string,
    );
  }
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
  moveCardFromSharedZoneToPlayerZoneInPlace({
    ...options,
    table: nextTable,
  });
  return nextTable;
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
    options.fromZoneId as string,
    "shared",
    "moveCardFromSharedZoneToPlayerZone",
    "fromZoneId",
  );
  assertZoneScope(
    options.table,
    options.toZoneId as string,
    "perPlayer",
    "moveCardFromSharedZoneToPlayerZone",
    "toZoneId",
  );

  assertCardInSharedZone(
    options.table,
    options.fromZoneId as string,
    options.cardId as string,
  );
  assertCardAbsentFromPlayerZone(
    options.table,
    options.toZoneId as string,
    options.playerId as string,
    options.cardId as string,
  );
  assertCardAllowedInZone(
    options.table,
    options.toZoneId as string,
    options.cardId as string,
  );

  const destinationCards = playerZoneCards(
    options.table,
    options.toZoneId as string,
    options.playerId as string,
  );
  const nextDestination = insertCard(
    destinationCards,
    options.cardId as string,
    options.position ?? "bottom",
  );
  removeCardFromSharedZoneCollectionInPlace(
    options.table,
    options.fromZoneId,
    options.cardId as string,
  );
  setPlayerZoneCardsInPlace(
    options.table,
    options.toZoneId,
    options.playerId,
    nextDestination,
  );
  options.table.ownerOfCard[options.cardId as string] =
    options.playerId as string;
  options.table.visibility[options.cardId as string] =
    computeVisibilityForPlayerZone(
      options.table,
      options.toZoneId as string,
      options.playerId as string,
    );
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
  moveCardBetweenPlayerZonesInPlace({
    ...options,
    table: nextTable,
  });
  return nextTable;
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
    options.fromZoneId as string,
    "perPlayer",
    "moveCardBetweenPlayerZones",
    "fromZoneId",
  );
  assertZoneScope(
    options.table,
    options.toZoneId as string,
    "perPlayer",
    "moveCardBetweenPlayerZones",
    "toZoneId",
  );

  assertCardInPlayerZone(
    options.table,
    options.fromZoneId as string,
    options.playerId as string,
    options.cardId as string,
  );
  assertCardAbsentFromPlayerZone(
    options.table,
    options.toZoneId as string,
    options.playerId as string,
    options.cardId as string,
  );
  assertCardAllowedInZone(
    options.table,
    options.toZoneId as string,
    options.cardId as string,
  );

  const sourceCards = playerZoneCards(
    options.table,
    options.fromZoneId as string,
    options.playerId as string,
  );
  const destinationCards = playerZoneCards(
    options.table,
    options.toZoneId as string,
    options.playerId as string,
  );
  const remainingSource = removeCard(sourceCards, options.cardId as string);
  const nextDestination = insertCard(
    destinationCards,
    options.cardId as string,
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
  options.table.visibility[options.cardId as string] =
    computeVisibilityForPlayerZone(
      options.table,
      options.toZoneId as string,
      options.playerId as string,
    );
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
  const nextTable = cloneRuntimeTable(options.table);
  moveCardBetweenSharedZonesInPlace({
    ...options,
    table: nextTable,
  });
  return nextTable;
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
    options.fromZoneId as string,
    "shared",
    "moveCardBetweenSharedZones",
    "fromZoneId",
  );
  assertZoneScope(
    options.table,
    options.toZoneId as string,
    "shared",
    "moveCardBetweenSharedZones",
    "toZoneId",
  );
  assertCardInSharedZone(
    options.table,
    options.fromZoneId as string,
    options.cardId as string,
  );
  assertCardAbsentFromSharedZone(
    options.table,
    options.toZoneId as string,
    options.cardId as string,
  );
  assertCardAllowedInZone(
    options.table,
    options.toZoneId as string,
    options.cardId as string,
  );

  removeCardFromSharedZoneCollectionInPlace(
    options.table,
    options.fromZoneId,
    options.cardId as string,
  );
  appendCardToSharedZoneCollectionInPlace(
    options.table,
    options.toZoneId,
    options.cardId as string,
    (options.playedBy ?? null) as string | null,
    options.position ?? "bottom",
  );
  options.table.ownerOfCard[options.cardId as string] =
    options.playedBy ?? null;
  options.table.visibility[options.cardId as string] = {
    faceUp: true,
  };
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
  dealCardsFromDeckToHandInPlace(
    nextTable,
    fromZoneId,
    playerId,
    toZoneId,
    count,
  );
  return nextTable;
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
    fromZoneId as string,
    "shared",
    "dealCardsFromDeckToHand",
    "fromZoneId",
  );
  assertZoneScope(
    table,
    toZoneId as string,
    "perPlayer",
    "dealCardsFromDeckToHand",
    "toZoneId",
  );

  const sourceCards = sharedZoneCards(table, fromZoneId as string);
  const selectedCards = sourceCards.slice(0, count);
  const destinationCards = playerZoneCards(
    table,
    toZoneId as string,
    playerId as string,
  );

  for (const cardId of selectedCards) {
    assertCardInSharedZone(table, fromZoneId as string, cardId);
    assertCardAbsentFromPlayerZone(
      table,
      toZoneId as string,
      playerId as string,
      cardId,
    );
    assertCardAllowedInZone(table, toZoneId as string, cardId);
  }

  const remainingSource = sourceCards.slice(selectedCards.length);
  const nextHand = [...destinationCards, ...selectedCards];
  syncSharedZoneWithDeck(
    table,
    fromZoneId,
    remainingSource as DeckCardsOfTable<Table, DeckId>,
  );
  reindexSharedZoneCards(table, fromZoneId as string, remainingSource);
  setPlayerZoneCardsInPlace(table, toZoneId, playerId, nextHand);

  for (const cardId of selectedCards) {
    table.ownerOfCard[cardId] = playerId;
    table.visibility[cardId] = computeVisibilityForPlayerZone(
      table,
      toZoneId as string,
      playerId as string,
    );
  }
}
