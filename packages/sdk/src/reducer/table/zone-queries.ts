import type {
  CardCollection,
  ViewCard,
  ViewSlotOccupant,
} from "@dreamboard-games/sdk-types";
import type {
  CardIdOfTable,
  ComponentIdOfTable,
  DeckCardsOfTable,
  DeckIdOfTable,
  HandCardsOfTable,
  HandIdOfTable,
  PlayerIdOfTable,
  PlayerZoneIdOfTable,
  RuntimeComponentLocation,
  RuntimeTableRecord,
  SharedZoneIdOfTable,
} from "../model";
import {
  assertZoneScope,
  ensureArray,
  orderedComponentIdsForLocation,
  ppRead,
} from "./internal";

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
