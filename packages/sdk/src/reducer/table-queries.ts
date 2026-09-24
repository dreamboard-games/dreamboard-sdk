import { bindBoardQueries } from "./table/board-queries";
import type {
  BoardIdOfTable,
  CardIdOfTable,
  ComponentDataOfTable,
  ComponentIdOfTable,
  DeckIdOfTable,
  HandIdOfTable,
  PlayerIdOfTable,
  RuntimeTableRecord,
  TableQueries,
  TableQueriesOfState,
} from "./model";
import {
  getAllPlayerZoneCards,
  getAllSharedZoneCards,
  getCard,
  getCardsById,
  getCardOwner,
  getCardVisibility,
  getSlotOccupants,
  getSlotOccupantsByHost,
  getComponentContainerLocation,
  getComponentDeckLocation,
  getComponentEdgeLocation,
  getComponentHandLocation,
  getComponentLocation,
  getComponentSlotLocation,
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
  getPlayerZoneCardCollection,
  getPlayerZoneCards,
  getSharedZoneCardCollection,
  getSharedZoneCards,
} from "./table";

export function createTableQueries<Table extends RuntimeTableRecord>(
  table: Table,
): TableQueries<Table> {
  return {
    board: <BoardId extends BoardIdOfTable<Table>>(boardId: BoardId) =>
      bindBoardQueries(table, boardId),
    zone: {
      sharedCards: <ZoneId extends DeckIdOfTable<Table>>(zoneId: ZoneId) =>
        getSharedZoneCards(table, zoneId),
      sharedCardCollection: <ZoneId extends DeckIdOfTable<Table>>(
        zoneId: ZoneId,
      ) => getSharedZoneCardCollection(table, zoneId),
      allSharedCards: () => getAllSharedZoneCards(table),
      playerCards: <
        PlayerId extends PlayerIdOfTable<Table>,
        ZoneId extends HandIdOfTable<Table>,
      >(
        playerId: PlayerId,
        zoneId: ZoneId,
      ) => getPlayerZoneCards(table, playerId, zoneId),
      playerCardCollection: <
        PlayerId extends PlayerIdOfTable<Table>,
        ZoneId extends HandIdOfTable<Table>,
      >(
        playerId: PlayerId,
        zoneId: ZoneId,
      ) => getPlayerZoneCardCollection(table, playerId, zoneId),
      allPlayerCards: <ZoneId extends HandIdOfTable<Table>>(zoneId: ZoneId) =>
        getAllPlayerZoneCards(table, zoneId),
    },
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
    slot: {
      occupants: (host, slotId) => getSlotOccupants(table, host, slotId),
      occupantsByHost: (host) => getSlotOccupantsByHost(table, host),
      pieceOccupants: (hostId, slotId) =>
        getSlotOccupants(table, { kind: "piece", id: hostId }, slotId),
      pieceOccupantsByHost: (hostId) =>
        getSlotOccupantsByHost(table, { kind: "piece", id: hostId }),
      dieOccupants: (hostId, slotId) =>
        getSlotOccupants(table, { kind: "die", id: hostId }, slotId),
      dieOccupantsByHost: (hostId) =>
        getSlotOccupantsByHost(table, { kind: "die", id: hostId }),
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
        (table.cards[componentId] ??
          table.pieces[componentId] ??
          table.dice[componentId]) as
          | ComponentDataOfTable<Table, ComponentId>
          | undefined,
      location: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentLocation(table, componentId),
      deck: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentDeckLocation(table, componentId),
      hand: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentHandLocation(table, componentId),
      zone: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentZoneLocation(table, componentId),
      space: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentSpaceLocation(table, componentId),
      container: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentContainerLocation(table, componentId),
      edge: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentEdgeLocation(table, componentId),
      vertex: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentVertexLocation(table, componentId),
      slot: <ComponentId extends ComponentIdOfTable<Table>>(
        componentId: ComponentId,
      ) => getComponentSlotLocation(table, componentId),
    },
  };
}

export function createStateQueries<State extends { table: RuntimeTableRecord }>(
  state: State,
): TableQueriesOfState<State> {
  return createTableQueries(
    state.table,
  ) as unknown as TableQueriesOfState<State>;
}
