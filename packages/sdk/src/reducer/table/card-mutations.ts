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
  const deckCards = [...ensureArray(table.decks[deckId])] as DeckCardsOfTable<
    Table,
    DeckId
  >;
  assertCardAllowedInZone(table, deckId, cardId);
  if (position === "top") {
    deckCards.unshift(cardId);
  } else {
    deckCards.push(cardId);
  }
  syncSharedZoneWithDeck(table, deckId, deckCards);
  for (const [index, currentCardId] of deckCards.entries()) {
    if (currentCardId === cardId) {
      table.componentLocations[currentCardId] = {
        type: "InDeck",
        deckId,
        playedBy,
        position: index,
      };
      continue;
    }
    const existing = table.componentLocations[currentCardId];
    table.componentLocations[currentCardId] = {
      type: "InDeck",
      deckId,
      playedBy: existing?.type === "InDeck" ? existing.playedBy : null,
      position: index,
    };
  }
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
  const remaining = ensureArray(table.decks[deckId]).filter(
    (candidate) => candidate !== cardId,
  );
  syncSharedZoneWithDeck(table, deckId, remaining);
  for (const [index, currentCardId] of remaining.entries()) {
    const currentLocation = table.componentLocations[currentCardId];
    if (currentLocation?.type === "InDeck") {
      table.componentLocations[currentCardId] = {
        ...currentLocation,
        position: index,
      };
    }
  }
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
  const currentHand = ensureArray(
    ppRead(options.table.hands[options.handId], options.playerId as string) as
      | readonly string[]
      | undefined,
  ).filter((candidate) => candidate !== options.cardId);
  syncPlayerZoneWithHand(
    options.table,
    options.handId,
    options.playerId,
    currentHand,
  );
  for (const [index, currentCardId] of currentHand.entries()) {
    options.table.componentLocations[currentCardId as string] = {
      type: "InHand",
      handId: options.handId,
      playerId: options.playerId,
      position: index,
    };
  }
  options.table.ownerOfCard[options.cardId] =
    options.playedBy ?? options.playerId;
  options.table.visibility[options.cardId] = {
    faceUp: true,
  };
  appendToDeckInPlace(
    options.table,
    options.deckId,
    options.cardId,
    options.playedBy ?? options.playerId,
    options.position ?? "bottom",
  );
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
    moveCardBetweenPlayerZonesInPlace({
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

  const sourceCards = ensureArray(
    options.table.zones.shared[options.fromZoneId] ??
      options.table.decks[options.fromZoneId],
  );
  if (!sourceCards.includes(options.cardId as string)) {
    throw new Error(
      `Card '${String(options.cardId)}' is not in shared zone '${String(
        options.fromZoneId,
      )}'.`,
    );
  }
  assertCardAllowedInZone(
    options.table,
    options.toZoneId as string,
    options.cardId as string,
  );

  const remainingSource = sourceCards.filter(
    (candidate) => candidate !== options.cardId,
  );
  syncSharedZoneWithDeck(options.table, options.fromZoneId, remainingSource);
  for (const [index, currentCardId] of remainingSource.entries()) {
    const existing = options.table.componentLocations[currentCardId];
    if (existing?.type === "InDeck") {
      options.table.componentLocations[currentCardId] = {
        ...existing,
        position: index,
      };
    }
  }

  const destinationCards = ensureArray(
    ppRead(
      options.table.zones.perPlayer[options.toZoneId] ??
        options.table.hands[options.toZoneId],
      options.playerId as string,
    ) as readonly string[] | undefined,
  );
  const nextDestination =
    options.position === "top"
      ? [options.cardId as string, ...destinationCards]
      : [...destinationCards, options.cardId as string];
  syncPlayerZoneWithHand(
    options.table,
    options.toZoneId,
    options.playerId,
    nextDestination,
  );
  for (const [index, currentCardId] of nextDestination.entries()) {
    options.table.componentLocations[currentCardId] = {
      type: "InHand",
      handId: options.toZoneId as string,
      playerId: options.playerId as string,
      position: index,
    };
  }
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

  const sourceCards = ensureArray(
    ppRead(
      options.table.zones.perPlayer[options.fromZoneId] ??
        options.table.hands[options.fromZoneId],
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
    options.table,
    options.toZoneId as string,
    options.cardId as string,
  );

  const remainingSource = sourceCards.filter(
    (candidate) => candidate !== options.cardId,
  );
  syncPlayerZoneWithHand(
    options.table,
    options.fromZoneId,
    options.playerId,
    remainingSource,
  );
  for (const [index, currentCardId] of remainingSource.entries()) {
    const existing = options.table.componentLocations[currentCardId];
    if (existing?.type === "InHand") {
      options.table.componentLocations[currentCardId] = {
        ...existing,
        position: index,
      };
    }
  }

  const destinationCards = ensureArray(
    ppRead(
      options.table.zones.perPlayer[options.toZoneId] ??
        options.table.hands[options.toZoneId],
      options.playerId as string,
    ) as readonly string[] | undefined,
  );
  const nextDestination =
    options.position === "top"
      ? [options.cardId as string, ...destinationCards]
      : [...destinationCards, options.cardId as string];
  syncPlayerZoneWithHand(
    options.table,
    options.toZoneId,
    options.playerId,
    nextDestination,
  );
  for (const [index, currentCardId] of nextDestination.entries()) {
    options.table.componentLocations[currentCardId] = {
      type: "InHand",
      handId: options.toZoneId as string,
      playerId: options.playerId as string,
      position: index,
    };
  }
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
  removeFromDeckInPlace(options.table, options.fromZoneId, options.cardId);
  appendToDeckInPlace(
    options.table,
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
  const publicHands = new Set(
    Object.entries(table.handVisibility)
      .filter(([, mode]) => mode === "all" || mode === "public")
      .map(([handId]) => handId),
  );

  for (let index = 0; index < count; index += 1) {
    const nextCard = ensureArray(table.decks[fromZoneId])[0];
    if (!nextCard) {
      break;
    }
    table.decks[fromZoneId] = ensureArray(table.decks[fromZoneId]).slice(
      1,
    ) as (typeof table.decks)[DeckId];
    table.zones.shared[fromZoneId] = [
      ...ensureArray(table.decks[fromZoneId]),
    ] as (typeof table.zones.shared)[DeckId];
    const prevHand = ppRead(table.hands[toZoneId], playerId as string) as
      | readonly string[]
      | undefined;
    const nextHand = [...ensureArray(prevHand), nextCard];
    assertCardAllowedInZone(table, toZoneId, nextCard);
    table.hands[toZoneId] = ppWrite(
      table.hands[toZoneId],
      playerId as string,
      nextHand,
    ) as (typeof table.hands)[HandId];
    table.zones.perPlayer[toZoneId] = ppWrite(
      table.zones.perPlayer[toZoneId],
      playerId as string,
      [...nextHand],
    ) as (typeof table.zones.perPlayer)[HandId];
    table.componentLocations[nextCard] = {
      type: "InHand",
      handId: toZoneId,
      playerId,
      position: nextHand.length - 1,
    };
    table.ownerOfCard[nextCard] = playerId;
    table.visibility[nextCard] = publicHands.has(toZoneId as string)
      ? {
          faceUp: true,
        }
      : {
          faceUp: false,
          visibleTo: [playerId],
        };
  }
}
