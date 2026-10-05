import type { RuntimeTableRecord, ZoneDefinitions } from "../../model";
import type { RuntimeJson } from "../../../shared/runtime-json";
import { getZoneComponents } from "../../table/zone-queries";
import { enumerateZoneHosts, resolveZoneAccess } from "../../table/zones";
import type { InteractionDescriptorShape } from "./interaction-types";

export type SeatZone = readonly [
  zoneId: string,
  hostId: string,
  cardIds: readonly string[],
];

/**
 * The cards a seat cannot see: every card in a hidden zone and each face-down
 * card not shown to it. The seat knows each one by its position,
 * an opaque reference to its zone, host and position, so neither a face-down card nor a hidden deck's
 * order reveals which card it is. Card ids are otherwise the table's own.
 */
export type CardConcealment = {
  /** Zone hosts whose projected card inventory this seat may access. */
  zones: readonly SeatZone[];
  /** The id the seat knows a card by. */
  seatCardId(cardId: string): string;
  isHidden(cardId: string): boolean;
  canTarget(cardId: string): boolean;
  /**
   * The card a submitted id names, or `null` when it is the table id of a
   * card hidden from the seat.
   */
  tableCardId(id: string): string | null;
};

export function concealCards(
  table: RuntimeTableRecord,
  playerId: string,
  definitions: ZoneDefinitions,
): CardConcealment {
  const zones: SeatZone[] = [];
  const seatIds = new Map<string, string>();
  const tableIds = new Map<string, string>();
  const denied = new Set<string>();
  for (const [zoneId, definition] of Object.entries(
    definitions.zoneDefinitions,
  )) {
    const hosts = enumerateZoneHosts(table, definitions, definition);
    for (const hostId of hosts) {
      const accessible = resolveZoneAccess(
        table,
        definitions,
        definition,
        hostId,
        playerId,
      );
      const cardIds = getZoneComponents(table, definitions, {
        zoneId,
        hostId,
      }).filter((id) => Object.hasOwn(table.cards, id));
      if (accessible) zones.push([zoneId, hostId, cardIds]);
      const hiddenZone = definition.visibility === "hidden";
      cardIds.forEach((cardId, index) => {
        if (!accessible) denied.add(cardId);
        const visibility = table.visibility[cardId];
        if (
          accessible &&
          !hiddenZone &&
          (!visibility ||
            visibility.faceUp ||
            visibility.visibleTo?.includes(playerId))
        )
          return;
        const seatId = `hidden:${JSON.stringify([zoneId, hostId, index])}`;
        if (Object.hasOwn(table.cards, seatId))
          throw new Error(
            "Card id conflicts with the reserved concealed-id namespace.",
          );
        seatIds.set(cardId, seatId);
        if (accessible) tableIds.set(seatId, cardId);
      });
    }
  }
  return {
    zones,
    seatCardId: (cardId) => seatIds.get(cardId) ?? cardId,
    isHidden: (cardId) => seatIds.has(cardId),
    canTarget: (cardId) => !denied.has(cardId),
    tableCardId: (id) =>
      tableIds.get(id) ??
      (seatIds.has(id) || denied.has(id) || id.startsWith("hidden:")
        ? null
        : id),
  };
}

/** Maps a card input's value, one card id or several. */
function mapCards(
  value: unknown,
  map: (cardId: string) => string | null,
): unknown {
  return typeof value === "string"
    ? map(value)
    : Array.isArray(value)
      ? value.map((item) => mapCards(item, map))
      : value;
}

/**
 * Rewrites a descriptor's card ids to the ones its seat knows them by.
 * `cardKeys` names the inputs holding cards; other values stay as they are.
 */
export function concealDescriptor(
  descriptor: InteractionDescriptorShape,
  cardKeys: ReadonlySet<string>,
  concealment: CardConcealment,
): InteractionDescriptorShape {
  const denied = (value: unknown): boolean =>
    typeof value === "string"
      ? !concealment.canTarget(value)
      : Array.isArray(value) && value.some(denied);
  const conceal = (value: unknown) => mapCards(value, concealment.seatCardId);
  return {
    ...descriptor,
    inputs: descriptor.inputs.map((input) => {
      if (input.domain.type !== "cardTarget") return input;
      const { defaultValue, ...rest } = input;
      return {
        ...rest,
        domain: {
          ...input.domain,
          eligibleTargets: input.domain.eligibleTargets
            .filter(concealment.canTarget)
            .map(concealment.seatCardId),
        },
        ...(defaultValue === undefined || denied(defaultValue)
          ? {}
          : { defaultValue: conceal(defaultValue) }),
      };
    }),
    ...(descriptor.step
      ? {
          step: {
            ...descriptor.step,
            selected: Object.fromEntries(
              Object.entries(descriptor.step.selected)
                .filter(([key, value]) => !cardKeys.has(key) || !denied(value))
                .map(([key, value]) => [
                  key,
                  cardKeys.has(key) ? conceal(value) : value,
                ]),
            ),
          },
        }
      : {}),
  };
}

/**
 * Names the cards hidden from a seat by position, as the seat itself would.
 * Tests act with full knowledge of the table.
 */
export function concealSubmittedCards(
  params: RuntimeJson,
  cardKeys: ReadonlySet<string>,
  concealment: CardConcealment,
): RuntimeJson {
  const conceal = (value: RuntimeJson): RuntimeJson =>
    typeof value === "string"
      ? concealment.seatCardId(value)
      : Array.isArray(value)
        ? value.map(conceal)
        : value;
  if (params === null || typeof params !== "object" || Array.isArray(params))
    return params;
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      cardKeys.has(key) ? conceal(value) : value,
    ]),
  );
}

/**
 * Resolves the cards a seat submitted to table ids, or returns `null` when
 * one names a card hidden from the seat by its table id.
 */
export function revealSubmittedCards(
  params: Readonly<Record<string, unknown>>,
  cardKeys: ReadonlySet<string>,
  concealment: CardConcealment,
): Record<string, unknown> | null {
  let named = false;
  const reveal = (id: string) => {
    const cardId = concealment.tableCardId(id);
    if (cardId === null) named = true;
    return cardId;
  };
  const revealed = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      cardKeys.has(key) ? mapCards(value, reveal) : value,
    ]),
  );
  return named ? null : revealed;
}
