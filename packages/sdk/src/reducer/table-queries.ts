import {
  getZoneComponents,
  getZoneCardCollection,
  getZones,
} from "./table/zone-queries";
import { requireLookup } from "../shared/lookup.js";
import { bindBoardQueries } from "./table/board-queries";
import type {
  ZoneDefinitions,
  TileIdOfTable,
  BoardIdOfTable,
  CardIdOfTable,
  ComponentDataOfTable,
  ComponentIdOfTable,
  RuntimeTableRecord,
  TableQueries,
  TableQueriesOfState,
} from "./model";
import {
  getCard,
  getCardsById,
  getCardOwner,
  getCardVisibility,
  getComponentEdgeLocation,
  getComponentLocation,
  getComponentSpaceLocation,
  getComponentVertexLocation,
  getComponentZoneLocation,
  canAffordResources,
  getMissingResources,
  getNextPlayerInOrder,
  getPlayerOrder,
  getPlayerResourceAmount,
  getPlayerResourceTotal,
  getPlayerResources,
} from "./table";

export function createTableQueries<Table extends RuntimeTableRecord>(
  table: Table,
  definitions: ZoneDefinitions,
): TableQueries<Table> {
  return {
    tile: <Id extends TileIdOfTable<Table>>(tileId: Id) =>
      requireLookup(
        Object.hasOwn(table.tiles, tileId) ? table.tiles[tileId] : undefined,
        "Tile",
        tileId,
      ) as Table["tiles"][Id],
    board: <BoardId extends BoardIdOfTable<Table>>(boardId: BoardId) =>
      bindBoardQueries(table, boardId),
    // Query construction boundary: compiled definitions admit hosts and canonical
    // memberships supply component IDs; the card path filters own card entries.
    // eslint-disable-next-line no-restricted-syntax -- Construction boundary binding admitted runtime memberships to exact table IDs.
    zone: Object.assign(
      (zoneId: string, hostId?: string) =>
        getZoneComponents(table, definitions, { zoneId, hostId }),
      {
        cards: (zoneId: string, hostId?: string) =>
          getZoneCardCollection(table, definitions, { zoneId, hostId }),
      },
    ) as unknown as TableQueries<Table>["zone"],
    zones: ((zoneId: string) =>
      getZones(table, definitions, zoneId)) as TableQueries<Table>["zones"],
    card: {
      get: <CardId extends CardIdOfTable<Table>>(cardId: CardId) =>
        getCard(table, cardId),
      byIds: <CardIds extends readonly CardIdOfTable<Table>[]>(
        cardIds: CardIds,
      ) => getCardsById(table, cardIds),
      owner: <CardId extends CardIdOfTable<Table>>(cardId: CardId) =>
        getCardOwner(table, cardId),
      visibility: <CardId extends CardIdOfTable<Table>>(cardId: CardId) =>
        getCardVisibility(table, cardId),
    },
    player: {
      order: () => getPlayerOrder(table),
      nextInOrder: (playerId) => getNextPlayerInOrder(table, playerId),
      resources: (playerId) => getPlayerResources(table, playerId),
      resource: (playerId, resourceId) =>
        getPlayerResourceAmount(table, playerId, resourceId),
      resourceTotal: (playerId) => getPlayerResourceTotal(table, playerId),
      canAfford: (playerId, amounts) =>
        canAffordResources(table, playerId, amounts),
      missingResources: (playerId, amounts) =>
        getMissingResources(table, playerId, amounts),
    },
    component: {
      data: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) =>
        requireLookup(
          Object.hasOwn(table.cards, componentId)
            ? table.cards[componentId]
            : Object.hasOwn(table.pieces, componentId)
              ? table.pieces[componentId]
              : Object.hasOwn(table.dice, componentId)
                ? table.dice[componentId]
                : Object.hasOwn(table.tiles, componentId)
                  ? table.tiles[componentId]
                  : undefined,
          "Component",
          componentId,
        ) as ComponentDataOfTable<Table, ComponentId>,
      location: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentLocation(table, componentId),
      zone: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentZoneLocation(table, componentId),
      space: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentSpaceLocation(table, componentId),
      edge: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentEdgeLocation(table, componentId),
      vertex: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentVertexLocation(table, componentId),
    },
  };
}

export function createStateQueries<State extends { table: RuntimeTableRecord }>(
  state: State,
  definitions: ZoneDefinitions,
): TableQueriesOfState<State> {
  // eslint-disable-next-line no-restricted-syntax -- Queries are constructed from this State.table; the conditional TableOfState type denotes that same table.
  return createTableQueries(
    state.table,
    definitions,
  ) as unknown as TableQueriesOfState<State>;
}
