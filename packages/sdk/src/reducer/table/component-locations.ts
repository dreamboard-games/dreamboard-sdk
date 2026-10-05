import { requireLookup } from "../../shared/lookup.js";
import type {
  BoardContainerIdOfTable,
  BoardIdOfTable,
  ComponentLocationOfTable,
  ComponentIdOfTable,
  ResolvedContainerLocation,
  ResolvedEdgeLocation,
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

export function getComponentLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ComponentLocationOfTable<Table, ComponentId> {
  return requireLookup(
    table.componentLocations[componentId],
    "Component location",
    componentId,
  ) as ComponentLocationOfTable<Table, ComponentId>;
}

export function getComponentZoneLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  componentId: ComponentId,
): ResolvedZoneLocation<Table, ComponentId> | null {
  const location = getComponentLocation(table, componentId);
  if (location.type !== "InZone") {
    return null;
  }

  return {
    componentId,
    zoneId: location.zoneId,
    hostId: location.hostId,
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
  if (location.type !== "OnSpace") {
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
  if (location.type !== "InContainer") {
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
  if (location.type !== "OnEdge") {
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
  if (location.type !== "OnVertex") {
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
  if (location.type !== "InSlot") {
    return null;
  }

  return {
    componentId,
    host: location.host,
    slotId: location.slotId,
    location,
  } as ResolvedSlotLocation<Table, ComponentId>;
}
