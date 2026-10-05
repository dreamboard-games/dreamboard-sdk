import { requireLookup } from "../../shared/lookup.js";
import type {
  CardCollection,
  ViewCardOfTable,
} from "../../shared/domain/cards.js";
import type { CardIdOfTable, RuntimeTableRecord } from "../model";
import { enumerateZoneHosts, resolveZone, type ZoneInput } from "./zones";
import type { ZoneDefinitions } from "../model";

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
    enumerateZoneHosts(table, definition).map((hostId) => [
      hostId,
      getZoneComponents(table, definitions, { zoneId, hostId }),
    ]),
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
