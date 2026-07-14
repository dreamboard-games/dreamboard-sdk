import type {
  BoardContainerIdOfTable,
  BoardIdOfTable,
  BoardTypeIdOfTable,
  CardIdOfTable,
  ComponentDataOfTable,
  ComponentIdOfTable,
  DeckIdOfTable,
  HandIdOfTable,
  HexBoardIdOfTable,
  HexSpaceIdOfTable,
  PlayerIdOfTable,
  RelationTypeIdOfTable,
  RuntimeTableRecord,
  SpaceIdOfTable,
  SpaceTypeIdOfTable,
  SquareBoardIdOfTable,
  SquareSpaceIdOfTable,
  TableQueries,
  TableQueriesOfState,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledEdgeTypeIdOfTable,
  TiledVertexIdOfTable,
  TiledVertexTypeIdOfTable,
} from "./model";
import {
  getAdjacentSpaces,
  getAllPlayerZoneCards,
  getAllSharedZoneCards,
  getBoard,
  getBoardsByTypeId,
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
  getComponentsInContainer,
  getComponentsOnEdge,
  getComponentsOnSpace,
  getComponentsOnVertex,
  getContainer,
  getEdge,
  getEdgesByTypeId,
  getHexBoard,
  getHexSpace,
  getHexSpaceAt,
  getIncidentEdges,
  getIncidentVertices,
  canAffordResources,
  getMissingResources,
  getNextPlayerInOrder,
  getPlayerOrder,
  getPlayerResourceAmount,
  getPlayerResourceTotal,
  getPlayerResources,
  getPlayerZoneCardCollection,
  getPlayerZoneCards,
  getRelatedSpaces,
  getSharedZoneCardCollection,
  getSharedZoneCards,
  getSpace,
  getSpaceDistance,
  getSpaceEdges,
  getSpacesByTypeId,
  getSpaceVertices,
  getSquareBoard,
  getSquareDistance,
  getSquareNeighbors,
  getSquareSpace,
  getSquareSpaceAt,
  getTiledBoard,
  getVertex,
  getVerticesByTypeId,
} from "./table";

export function createTableQueries<Table extends RuntimeTableRecord>(
  table: Table,
): TableQueries<Table> {
  return {
    board: {
      get: <BoardId extends BoardIdOfTable<Table>>(boardId: BoardId) =>
        getBoard(table, boardId),
      hex: <BoardId extends HexBoardIdOfTable<Table>>(boardId: BoardId) =>
        getHexBoard(table, boardId),
      square: <BoardId extends SquareBoardIdOfTable<Table>>(boardId: BoardId) =>
        getSquareBoard(table, boardId),
      tiled: <BoardId extends TiledBoardIdOfTable<Table>>(boardId: BoardId) =>
        getTiledBoard(table, boardId),
      space: <
        BoardId extends BoardIdOfTable<Table>,
        SpaceId extends SpaceIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        spaceId: SpaceId,
      ) => getSpace(table, boardId, spaceId),
      hexSpace: <
        BoardId extends HexBoardIdOfTable<Table>,
        SpaceId extends HexSpaceIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        spaceId: SpaceId,
      ) => getHexSpace(table, boardId, spaceId),
      squareSpace: <
        BoardId extends SquareBoardIdOfTable<Table>,
        SpaceId extends SquareSpaceIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        spaceId: SpaceId,
      ) => getSquareSpace(table, boardId, spaceId),
      container: <
        BoardId extends BoardIdOfTable<Table>,
        ContainerId extends BoardContainerIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        containerId: ContainerId,
      ) => getContainer(table, boardId, containerId),
      edge: <
        BoardId extends TiledBoardIdOfTable<Table>,
        EdgeId extends TiledEdgeIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        edgeId: EdgeId,
      ) => getEdge(table, boardId, edgeId),
      vertex: <
        BoardId extends TiledBoardIdOfTable<Table>,
        VertexId extends TiledVertexIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        vertexId: VertexId,
      ) => getVertex(table, boardId, vertexId),
      byType: <TypeId extends BoardTypeIdOfTable<Table>>(typeId: TypeId) =>
        getBoardsByTypeId(table, typeId),
      spacesByType: <
        BoardId extends BoardIdOfTable<Table>,
        TypeId extends SpaceTypeIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        typeId: TypeId,
      ) => getSpacesByTypeId(table, boardId, typeId),
      edgesByType: <
        BoardId extends TiledBoardIdOfTable<Table>,
        TypeId extends TiledEdgeTypeIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        typeId: TypeId,
      ) => getEdgesByTypeId(table, boardId, typeId),
      verticesByType: <
        BoardId extends TiledBoardIdOfTable<Table>,
        TypeId extends TiledVertexTypeIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        typeId: TypeId,
      ) => getVerticesByTypeId(table, boardId, typeId),
      adjacentSpaces: <
        BoardId extends BoardIdOfTable<Table>,
        SpaceId extends SpaceIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        spaceId: SpaceId,
      ) => getAdjacentSpaces(table, boardId, spaceId),
      relatedSpaces: <
        BoardId extends BoardIdOfTable<Table>,
        SpaceId extends SpaceIdOfTable<Table, BoardId>,
        TypeId extends RelationTypeIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        spaceId: SpaceId,
        relationTypeId: TypeId,
      ) => getRelatedSpaces(table, boardId, spaceId, relationTypeId),
      incidentEdges: <
        BoardId extends TiledBoardIdOfTable<Table>,
        VertexId extends TiledVertexIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        vertexId: VertexId,
      ) => getIncidentEdges(table, boardId, vertexId),
      incidentVertices: <
        BoardId extends TiledBoardIdOfTable<Table>,
        EdgeId extends TiledEdgeIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        edgeId: EdgeId,
      ) => getIncidentVertices(table, boardId, edgeId),
      spaceEdges: <BoardId extends TiledBoardIdOfTable<Table>>(
        boardId: BoardId,
        spaceId: SpaceIdOfTable<Table, BoardId>,
      ) => getSpaceEdges(table, boardId, spaceId),
      spaceVertices: <BoardId extends TiledBoardIdOfTable<Table>>(
        boardId: BoardId,
        spaceId: SpaceIdOfTable<Table, BoardId>,
      ) => getSpaceVertices(table, boardId, spaceId),
      spaceDistance: <
        BoardId extends BoardIdOfTable<Table>,
        SpaceId extends SpaceIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        fromSpaceId: SpaceId,
        toSpaceId: SpaceId,
      ) => getSpaceDistance(table, boardId, fromSpaceId, toSpaceId),
      hexSpaceAt: <BoardId extends HexBoardIdOfTable<Table>>(
        boardId: BoardId,
        q: number,
        r: number,
      ) => getHexSpaceAt(table, boardId, q, r),
      squareSpaceAt: <BoardId extends SquareBoardIdOfTable<Table>>(
        boardId: BoardId,
        row: number,
        col: number,
      ) => getSquareSpaceAt(table, boardId, row, col),
      squareNeighbors: <
        BoardId extends SquareBoardIdOfTable<Table>,
        SpaceId extends SquareSpaceIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        spaceId: SpaceId,
        options?: { mode?: "orthogonal" | "diagonal" | "all" },
      ) => getSquareNeighbors(table, boardId, spaceId, options),
      squareDistance: <
        BoardId extends SquareBoardIdOfTable<Table>,
        SpaceId extends SquareSpaceIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        fromSpaceId: SpaceId,
        toSpaceId: SpaceId,
        options?: { metric?: "manhattan" | "chebyshev" },
      ) => getSquareDistance(table, boardId, fromSpaceId, toSpaceId, options),
      spaceOccupants: <
        BoardId extends BoardIdOfTable<Table>,
        SpaceId extends SpaceIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        spaceId: SpaceId,
      ) => getComponentsOnSpace(table, boardId, spaceId),
      containerOccupants: <
        BoardId extends BoardIdOfTable<Table>,
        ContainerId extends BoardContainerIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        containerId: ContainerId,
      ) => getComponentsInContainer(table, boardId, containerId),
      edgeOccupants: <
        BoardId extends TiledBoardIdOfTable<Table>,
        EdgeId extends TiledEdgeIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        edgeId: EdgeId,
      ) => getComponentsOnEdge(table, boardId, edgeId),
      vertexOccupants: <
        BoardId extends TiledBoardIdOfTable<Table>,
        VertexId extends TiledVertexIdOfTable<Table, BoardId>,
      >(
        boardId: BoardId,
        vertexId: VertexId,
      ) => getComponentsOnVertex(table, boardId, vertexId),
    },
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
