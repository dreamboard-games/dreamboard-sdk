import type { ZoneDefinitions } from "../model/table.js";
import { requireLookup } from "../../shared/lookup.js";
import type {
  BoardIdOfTable,
  ComponentLocationOfTable,
  ComponentIdOfTable,
  ResolvedEdgeLocation,
  ResolvedSpaceLocation,
  ResolvedVertexLocation,
  ResolvedZoneLocation,
  RuntimeQueryTable,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledVertexIdOfTable,
} from "../model";
import {
  getBoard,
  getEdge,
  getSpace,
  getTiledBoard,
  getVertex,
} from "./board-queries";

export function getComponentLocation<
  Table extends RuntimeQueryTable,
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
  Table extends RuntimeQueryTable,
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
  Table extends RuntimeQueryTable,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
  Definitions extends ZoneDefinitions,
>(
  table: Table,
  definitions: Definitions,
  componentId: ComponentId,
): ResolvedSpaceLocation<Table, ComponentId, Definitions> | null {
  const location = getComponentLocation(table, componentId);
  if (location.type !== "OnSpace") {
    return null;
  }

  const boardId = location.boardId as BoardIdOfTable<Table>;
  const spaceId = location.spaceId;
  return {
    componentId,
    boardId,
    board: getBoard(table, definitions, boardId),
    spaceId,
    space: getSpace(table, definitions, boardId, spaceId),
    location,
  } as ResolvedSpaceLocation<Table, ComponentId, Definitions>;
}

export function getComponentEdgeLocation<
  Table extends RuntimeQueryTable,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
  Definitions extends ZoneDefinitions,
>(
  table: Table,
  definitions: Definitions,
  componentId: ComponentId,
): ResolvedEdgeLocation<Table, ComponentId, Definitions> | null {
  const location = getComponentLocation(table, componentId);
  if (location.type !== "OnEdge") {
    return null;
  }

  const boardId = location.boardId as TiledBoardIdOfTable<Table>;
  const edgeId = location.edgeId as TiledEdgeIdOfTable<Table, typeof boardId>;
  return {
    componentId,
    boardId,
    board: getTiledBoard(table, definitions, boardId),
    edgeId,
    edge: getEdge(table, definitions, boardId, edgeId),
    location,
  } as ResolvedEdgeLocation<Table, ComponentId, Definitions>;
}

export function getComponentVertexLocation<
  Table extends RuntimeQueryTable,
  ComponentId extends ComponentIdOfTable<NoInfer<Table>>,
  Definitions extends ZoneDefinitions,
>(
  table: Table,
  definitions: Definitions,
  componentId: ComponentId,
): ResolvedVertexLocation<Table, ComponentId, Definitions> | null {
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
    board: getTiledBoard(table, definitions, boardId),
    vertexId,
    vertex: getVertex(table, definitions, boardId, vertexId),
    location,
  } as ResolvedVertexLocation<Table, ComponentId, Definitions>;
}
