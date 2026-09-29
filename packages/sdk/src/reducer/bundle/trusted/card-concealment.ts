import type { RuntimeTableRecord } from "../../model";
import type { RuntimeJson } from "../../../shared/runtime-json";
import { getAllSharedZoneCards, getPlayerZoneCards } from "../../table";
import type { InteractionDescriptorShape } from "./interaction-types";

export type SeatZone = readonly [zoneId: string, cardIds: readonly string[]];

/**
 * The cards a seat cannot see: every card in a hidden zone and each face-down
 * card not shown to it. The seat knows each one by its position,
 * `hidden:<zone>:<index>`, so neither a face-down card nor a hidden deck's
 * order reveals which card it is. Card ids are otherwise the table's own.
 */
export type CardConcealment = {
  /** Every zone the seat's frame lists: its own player zones and all shared zones. */
  zones: readonly SeatZone[];
  /** The id the seat knows a card by. */
  seatCardId(cardId: string): string;
  isHidden(cardId: string): boolean;
  /**
   * The card a submitted id names, or `null` when it is the table id of a
   * card hidden from the seat.
   */
  tableCardId(id: string): string | null;
};

export function concealCards(
  table: RuntimeTableRecord,
  playerId: string,
  playerZoneIds: readonly string[],
): CardConcealment {
  const zones = [
    ...playerZoneIds.map((zoneId): SeatZone => [
      zoneId,
      getPlayerZoneCards(table, playerId, zoneId),
    ]),
    ...Object.entries(getAllSharedZoneCards(table)),
  ];
  const seatIds = new Map<string, string>();
  const tableIds = new Map<string, string>();
  for (const [zoneId, cardIds] of zones) {
    const hiddenZone =
      (table.zones.visibility[zoneId] ?? table.handVisibility[zoneId]) ===
      "hidden";
    cardIds.forEach((cardId, index) => {
      const visibility = table.visibility[cardId];
      if (
        !hiddenZone &&
        (!visibility ||
          visibility.faceUp ||
          visibility.visibleTo?.includes(playerId))
      )
        return;
      const seatId = `hidden:${zoneId}:${index}`;
      seatIds.set(cardId, seatId);
      tableIds.set(seatId, cardId);
    });
  }
  return {
    zones,
    seatCardId: (cardId) => seatIds.get(cardId) ?? cardId,
    isHidden: (cardId) => seatIds.has(cardId),
    tableCardId: (id) => tableIds.get(id) ?? (seatIds.has(id) ? null : id),
  };
}

/** Rewrites a descriptor's card ids to the ones its seat knows them by. */
export function concealDescriptor(
  descriptor: InteractionDescriptorShape,
  concealment: CardConcealment,
): InteractionDescriptorShape {
  const conceal = (value: unknown): unknown =>
    typeof value === "string"
      ? concealment.seatCardId(value)
      : Array.isArray(value)
        ? value.map(conceal)
        : value;
  return {
    ...descriptor,
    inputs: descriptor.inputs.map((input) =>
      input.domain.type === "cardTarget"
        ? {
            ...input,
            domain: {
              ...input.domain,
              eligibleTargets: input.domain.eligibleTargets.map(
                concealment.seatCardId,
              ),
            },
            ...(input.defaultValue === undefined
              ? {}
              : { defaultValue: conceal(input.defaultValue) }),
          }
        : input,
    ),
    ...(descriptor.step
      ? {
          step: {
            ...descriptor.step,
            selected: Object.fromEntries(
              Object.entries(descriptor.step.selected).map(([key, value]) => [
                key,
                conceal(value),
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
  concealment: CardConcealment,
): RuntimeJson {
  const conceal = (value: RuntimeJson): RuntimeJson =>
    Array.isArray(value)
      ? value.map(conceal)
      : typeof value === "string"
        ? concealment.seatCardId(value)
        : value;
  return params !== null && typeof params === "object" && !Array.isArray(params)
    ? Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, conceal(value)]),
      )
    : params;
}

/**
 * Resolves the card ids a seat submitted to table ids, or returns `null` when
 * one names a card hidden from the seat by its table id.
 */
export function revealSubmittedCards(
  params: Readonly<Record<string, unknown>>,
  concealment: CardConcealment,
): Record<string, unknown> | null {
  let named = false;
  const reveal = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(reveal);
    if (typeof value !== "string") return value;
    const cardId = concealment.tableCardId(value);
    if (cardId === null) named = true;
    return cardId;
  };
  const revealed = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, reveal(value)]),
  );
  return named ? null : revealed;
}
