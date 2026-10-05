import { isCardReferenceNamespace } from "../../../shared/domain/cards.js";
import type { RuntimeTableRecord } from "../../model";
import type { SeatDisclosure, SeatZoneInventory } from "./tile-disclosure.js";
import { encodeCanonicalPluginRuntimeJson } from "../../../shared/protocol/json.js";

type SeatZone = Pick<SeatZoneInventory, "zoneId" | "hostId" | "seatHostId"> & {
  readonly cardIds: readonly string[];
};

/** Card faces and location access use the same seat disclosure decisions as tiles. */
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
  disclosure: SeatDisclosure,
): CardConcealment {
  const zones: SeatZone[] = [];
  const seatIds = new Map<string, string>();
  const tableIds = new Map<string, string>();
  const denied = new Set<string>();
  const hidden = (cardId: string) => {
    const restriction = table.visibility[cardId];
    return (
      !disclosure.locationAccess(cardId).face ||
      (restriction &&
        !restriction.faceUp &&
        !restriction.visibleTo?.includes(playerId))
    );
  };
  const issue = (cardId: string, location: unknown, ordinal: number) => {
    const seatId = disclosure.cardRef(location, ordinal);
    if (Object.hasOwn(table.cards, seatId))
      throw new Error(
        "Card id conflicts with the reserved seat-reference namespace.",
      );
    seatIds.set(cardId, seatId);
    tableIds.set(seatId, cardId);
  };
  for (const cardId of Object.keys(table.cards)) {
    if (
      !disclosure.locationAccess(cardId).inventory ||
      (hidden(cardId) && table.componentLocations[cardId]?.type === "Detached")
    )
      denied.add(cardId);
  }
  for (const zone of disclosure.zones) {
    const cardIds = zone.componentIds.filter((id) =>
      Object.hasOwn(table.cards, id),
    );
    const { zoneId, hostId, seatHostId } = zone;
    zones.push({ zoneId, hostId, seatHostId, cardIds });
    cardIds.forEach((id, index) => {
      if (hidden(id)) issue(id, { zoneId, hostId: seatHostId }, index);
    });
  }
  const spatial = Object.keys(table.cards)
    .flatMap((cardId) => {
      const location = table.componentLocations[cardId];
      if (
        denied.has(cardId) ||
        !hidden(cardId) ||
        !location ||
        location.type === "InZone" ||
        location.type === "Detached"
      )
        return [];
      const publicLocation =
        location.type === "OnSpace"
          ? {
              ...location,
              spaceId: disclosure.boardTarget(
                "space",
                location.boardId,
                location.spaceId,
              ),
            }
          : location;
      return [
        {
          cardId,
          publicLocation,
          key: encodeCanonicalPluginRuntimeJson(publicLocation),
        },
      ];
    })
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  spatial.forEach(({ cardId, publicLocation }, index) =>
    issue(cardId, publicLocation, index),
  );
  return {
    zones,
    seatCardId: (cardId) => seatIds.get(cardId) ?? cardId,
    isHidden: (cardId) =>
      Object.hasOwn(table.cards, cardId) && Boolean(hidden(cardId)),
    canTarget: (cardId) =>
      Object.hasOwn(table.cards, cardId) && !denied.has(cardId),
    tableCardId: (id) =>
      tableIds.get(id) ??
      (!Object.hasOwn(table.cards, id) ||
      seatIds.has(id) ||
      denied.has(id) ||
      isCardReferenceNamespace(id)
        ? null
        : id),
  };
}
