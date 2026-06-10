import type {
  BoardContainerIdOfTable,
  BoardIdOfTable,
  ComponentLocationOfTable,
  ComponentIdOfTable,
  DeckIdOfTable,
  HandIdOfTable,
  PlayerIdOfTable,
  ResolvedContainerLocation,
  ResolvedDeckLocation,
  ResolvedEdgeLocation,
  ResolvedHandLocation,
  ResolvedSlotLocation,
  ResolvedSpaceLocation,
  ResolvedVertexLocation,
  ResolvedZoneLocation,
  RuntimeTableRecord,
  SpaceIdOfTable,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledVertexIdOfTable,
} from "../model";
import {
  getBoard,
  getContainer,
  getEdge,
  getSpace,
  getTiledBoard,
  getVertex,
} from "./board-queries";
import { ppRead } from "./internal";

export function getComponentLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ComponentLocationOfTable<Table, ComponentId> | undefined {
  return table.componentLocations[componentId] as
    | ComponentLocationOfTable<Table, ComponentId>
    | undefined;
}

export function getComponentDeckLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedDeckLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "InDeck") {
    return null;
  }

  return {
    componentId,
    deckId: location.deckId as DeckIdOfTable<Table>,
    cards: table.decks[location.deckId as DeckIdOfTable<Table>],
    location,
  } as ResolvedDeckLocation<Table, ComponentId>;
}

export function getComponentHandLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedHandLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "InHand") {
    return null;
  }

  return {
    componentId,
    handId: location.handId as HandIdOfTable<Table>,
    playerId: location.playerId as PlayerIdOfTable<Table>,
    cards: ppRead(
      table.hands[location.handId as HandIdOfTable<Table>],
      location.playerId as string,
    ),
    location,
  } as unknown as ResolvedHandLocation<Table, ComponentId>;
}

export function getComponentZoneLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedZoneLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "InZone") {
    return null;
  }

  return {
    componentId,
    zoneId: location.zoneId,
    location,
  } as ResolvedZoneLocation<Table, ComponentId>;
}

export function getComponentSpaceLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedSpaceLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "OnSpace") {
    return null;
  }

  const boardId = location.boardId as BoardIdOfTable<Table>;
  const spaceId = location.spaceId as SpaceIdOfTable<Table, typeof boardId>;
  return {
    componentId,
    boardId,
    board: getBoard(table, boardId),
    spaceId,
    space: getSpace(table, boardId, spaceId),
    location,
  } as ResolvedSpaceLocation<Table, ComponentId>;
}

export function getComponentContainerLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedContainerLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "InContainer") {
    return null;
  }

  const boardId = location.boardId as BoardIdOfTable<Table>;
  const containerId = location.containerId as BoardContainerIdOfTable<
    Table,
    typeof boardId
  >;
  return {
    componentId,
    boardId,
    board: getBoard(table, boardId),
    containerId,
    container: getContainer(table, boardId, containerId),
    location,
  } as ResolvedContainerLocation<Table, ComponentId>;
}

export function getComponentEdgeLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedEdgeLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "OnEdge") {
    return null;
  }

  const boardId = location.boardId as TiledBoardIdOfTable<Table>;
  const edgeId = location.edgeId as TiledEdgeIdOfTable<Table, typeof boardId>;
  return {
    componentId,
    boardId,
    board: getTiledBoard(table, boardId),
    edgeId,
    edge: getEdge(table, boardId, edgeId),
    location,
  } as ResolvedEdgeLocation<Table, ComponentId>;
}

export function getComponentVertexLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedVertexLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "OnVertex") {
    return null;
  }

  const boardId = location.boardId as TiledBoardIdOfTable<Table>;
  const vertexId = location.vertexId as TiledVertexIdOfTable<
    Table,
    typeof boardId
  >;
  return {
    componentId,
    boardId,
    board: getTiledBoard(table, boardId),
    vertexId,
    vertex: getVertex(table, boardId, vertexId),
    location,
  } as ResolvedVertexLocation<Table, ComponentId>;
}

export function getComponentSlotLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedSlotLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location?.type !== "InSlot") {
    return null;
  }

  return {
    componentId,
    host: location.host,
    slotId: location.slotId,
    location,
  } as ResolvedSlotLocation<Table, ComponentId>;
}
