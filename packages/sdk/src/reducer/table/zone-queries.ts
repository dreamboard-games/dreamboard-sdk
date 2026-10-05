import { requireLookup } from "../../shared/lookup.js";
import type {
  CardCollection,
  ViewCardOfTable,
} from "../../shared/domain/cards.js";
import type { ViewSlotOccupant } from "../../shared/domain/slots.js";
import type {
  CardIdOfTable,
  ComponentIdOfTable,
  PlayerIdOfTable,
  RuntimeComponentLocation,
  RuntimeTableRecord,
  SlotHostOfTable,
  SlotIdOfTable,
} from "../model";
import { orderedComponentIdsForLocation } from "./internal";
import { resolveZone, type ZoneInput } from "./zones";
import type { ZoneDefinitions } from "../model";

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
    return piece.properties;
  }

  const die = table.dice[componentId];
  if (die) {
    return die.properties;
  }

  const card = table.cards[componentId];
  if (card) {
    return card.properties;
  }

  return undefined;
}

export function getZoneComponents(
  table: RuntimeTableRecord,
  definitions: ZoneDefinitions,
  zone: ZoneInput,
): readonly string[] {
  return [...resolveZone(table, definitions, zone).ids];
}
export function getZones(
  table: RuntimeTableRecord,
  definitions: ZoneDefinitions,
  zoneId: string,
): Readonly<Record<string, readonly string[]>> {
  const definition = Object.hasOwn(definitions.zoneDefinitions, zoneId)
    ? definitions.zoneDefinitions[zoneId]
    : undefined;
  if (!definition) throw new Error(`Unknown zone '${zoneId}'.`);
  return Object.fromEntries(
    (definition.scope === "shared" ? ["table"] : table.playerOrder).map(
      (hostId) => [
        hostId,
        getZoneComponents(table, definitions, { zoneId, hostId }),
      ],
    ),
  );
}
export function getZoneCardCollection(
  table: RuntimeTableRecord,
  definitions: ZoneDefinitions,
  zone: ZoneInput,
): CardCollection {
  const cardIds = getZoneComponents(table, definitions, zone).filter((id) =>
    Object.hasOwn(table.cards, id),
  );
  return {
    cardIds,
    cardsById: Object.fromEntries(
      cardIds.map((id) => [id, getCard(table, id)]),
    ),
  };
}

export function getCard<
  Table extends RuntimeTableRecord,
  CardId extends CardIdOfTable<NoInfer<Table>>,
>(table: Table, cardId: CardId): ViewCardOfTable<Table, CardId> {
  const card = requireLookup(
    table.cards[cardId],
    "Card",
    cardId,
  ) as Table["cards"][CardId];

  return {
    id: card.id,
    cardType: card.cardType,
    name: card.name,
    text: card.text,
    frontImage: card.frontImage,
    backImage: card.backImage,
    properties: card.properties,
  } as ViewCardOfTable<Table, CardId>;
}

export function getCardsById<
  Table extends RuntimeTableRecord,
  const CardIds extends readonly CardIdOfTable<NoInfer<Table>>[],
>(
  table: Table,
  cardIds: CardIds,
): Readonly<{
  [Id in CardIds[number]]: ViewCardOfTable<Table, Id>;
}> {
  return Object.fromEntries(
    cardIds.map((cardId) => [cardId, getCard(table, cardId)]),
  );
}

export function getSlotOccupants<
  Table extends RuntimeTableRecord,
  Host extends SlotHostOfTable<Table>,
>(
  table: Table,
  host: Host,
  slotId: SlotIdOfTable<Table, NoInfer<Host>>,
): ViewSlotOccupantForTable<Table>[];
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
  host: SlotHostOfTable<Table>,
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
