import type {
  BoardContainerIdOfTable,
  BoardIdOfTable,
  RuntimeTableRecord,
} from "../model";
import { getContainer } from "./board-queries";

function allowedCardSetIdsForZone(
  table: RuntimeTableRecord,
  zoneId: string,
): readonly string[] {
  return table.zones.cardSetIdsByZoneId?.[zoneId] ?? [];
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
