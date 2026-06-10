import type {
  BoardContainerIdOfTable,
  BoardIdOfTable,
  BoardTypeIdOfTable,
  ComponentIdOfTable,
  HexBoardIdOfTable,
  HexSpaceIdOfTable,
  RelationTypeIdOfTable,
  RuntimeTableRecord,
  SquareBoardIdOfTable,
  SquareSpaceIdOfTable,
  SpaceIdOfTable,
  SpaceTypeIdOfTable,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledEdgeStateOfTable,
  TiledEdgeTypeIdOfTable,
  TiledVertexIdOfTable,
  TiledVertexStateOfTable,
  TiledVertexTypeIdOfTable,
} from "../model";
import { orderedComponentIdsForLocation } from "./internal";

export function getBoard<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
>(table: Table, boardId: BoardId): Table["boards"]["byId"][BoardId] {
  return table.boards.byId[boardId] as Table["boards"]["byId"][BoardId];
}

export function getHexBoard<
  Table extends RuntimeTableRecord,
  BoardId extends HexBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
): Extract<Table["boards"]["byId"][BoardId], { layout: "hex" }> {
  return getBoard(table, boardId) as Extract<
    Table["boards"]["byId"][BoardId],
    { layout: "hex" }
  >;
}

export function getTiledBoard<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
): Extract<Table["boards"]["byId"][BoardId], { layout: "hex" | "square" }> {
  return getBoard(table, boardId) as Extract<
    Table["boards"]["byId"][BoardId],
    { layout: "hex" | "square" }
  >;
}

export function getSquareBoard<
  Table extends RuntimeTableRecord,
  BoardId extends SquareBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
): Extract<Table["boards"]["byId"][BoardId], { layout: "square" }> {
  return getBoard(table, boardId) as Extract<
    Table["boards"]["byId"][BoardId],
    { layout: "square" }
  >;
}

export function getSpace<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceId,
): Table["boards"]["byId"][BoardId]["spaces"][SpaceId] {
  return getBoard(table, boardId).spaces[
    spaceId
  ] as Table["boards"]["byId"][BoardId]["spaces"][SpaceId];
}

export function getHexSpace<
  Table extends RuntimeTableRecord,
  BoardId extends HexBoardIdOfTable<NoInfer<Table>>,
  SpaceId extends HexSpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceId,
): Extract<
  Table["boards"]["byId"][BoardId],
  { layout: "hex" }
>["spaces"][SpaceId] {
  return getHexBoard(table, boardId).spaces[spaceId] as Extract<
    Table["boards"]["byId"][BoardId],
    { layout: "hex" }
  >["spaces"][SpaceId];
}

export function getSquareSpace<
  Table extends RuntimeTableRecord,
  BoardId extends SquareBoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SquareSpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceId,
): Extract<
  Table["boards"]["byId"][BoardId],
  { layout: "square" }
>["spaces"][SpaceId] {
  return getSquareBoard(table, boardId).spaces[spaceId] as Extract<
    Table["boards"]["byId"][BoardId],
    { layout: "square" }
  >["spaces"][SpaceId];
}

export function getContainer<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  ContainerId extends BoardContainerIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  containerId: ContainerId,
): Table["boards"]["byId"][BoardId]["containers"][ContainerId] {
  return getBoard(table, boardId).containers[
    containerId
  ] as Table["boards"]["byId"][BoardId]["containers"][ContainerId];
}

export function getEdge<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  EdgeId extends TiledEdgeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  edgeId: EdgeId,
): TiledEdgeStateOfTable<Table, BoardId, EdgeId> {
  const edge = getTiledBoard(table, boardId).edges.find(
    (candidate) => candidate.id === edgeId,
  );
  if (!edge) {
    throw new Error(`Unknown edge '${edgeId}' on board '${boardId}'.`);
  }
  return edge as TiledEdgeStateOfTable<Table, BoardId, EdgeId>;
}

export function getVertex<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  VertexId extends TiledVertexIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  vertexId: VertexId,
): TiledVertexStateOfTable<Table, BoardId, VertexId> {
  const vertex = getTiledBoard(table, boardId).vertices.find(
    (candidate) => candidate.id === vertexId,
  );
  if (!vertex) {
    throw new Error(`Unknown vertex '${vertexId}' on board '${boardId}'.`);
  }
  return vertex as TiledVertexStateOfTable<Table, BoardId, VertexId>;
}

export function getHexSpaceAt<
  Table extends RuntimeTableRecord,
  BoardId extends HexBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
  q: number,
  r: number,
):
  | Extract<
      Table["boards"]["byId"][BoardId],
      { layout: "hex" }
    >["spaces"][HexSpaceIdOfTable<NoInfer<Table>, BoardId>]
  | undefined {
  return Object.values(getHexBoard(table, boardId).spaces).find(
    (space) => space.q === q && space.r === r,
  ) as
    | Extract<
        Table["boards"]["byId"][BoardId],
        { layout: "hex" }
      >["spaces"][HexSpaceIdOfTable<NoInfer<Table>, BoardId>]
    | undefined;
}

export function getSquareSpaceAt<
  Table extends RuntimeTableRecord,
  BoardId extends SquareBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
  row: number,
  col: number,
):
  | Extract<
      Table["boards"]["byId"][BoardId],
      { layout: "square" }
    >["spaces"][SquareSpaceIdOfTable<NoInfer<Table>, BoardId>]
  | undefined {
  return Object.values(getSquareBoard(table, boardId).spaces).find(
    (space) => space.row === row && space.col === col,
  ) as
    | Extract<
        Table["boards"]["byId"][BoardId],
        { layout: "square" }
      >["spaces"][SquareSpaceIdOfTable<NoInfer<Table>, BoardId>]
    | undefined;
}

export function getSpaceEdges<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceIdOfTable<NoInfer<Table>, BoardId>,
): TiledEdgeIdOfTable<Table, BoardId>[] {
  return getTiledBoard(table, boardId)
    .edges.filter((edge) => edge.spaceIds.includes(spaceId))
    .map((edge) => edge.id as TiledEdgeIdOfTable<Table, BoardId>);
}

export function getSpaceVertices<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceIdOfTable<NoInfer<Table>, BoardId>,
): TiledVertexIdOfTable<Table, BoardId>[] {
  return getTiledBoard(table, boardId)
    .vertices.filter((vertex) => vertex.spaceIds.includes(spaceId))
    .map((vertex) => vertex.id as TiledVertexIdOfTable<Table, BoardId>);
}

export function getIncidentEdges<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  VertexId extends TiledVertexIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  vertexId: VertexId,
): TiledEdgeIdOfTable<Table, BoardId>[] {
  const tiledBoard = getTiledBoard(table, boardId);
  const vertex = tiledBoard.vertices.find(
    (candidate) => candidate.id === vertexId,
  );
  if (!vertex) {
    throw new Error(`Unknown vertex '${vertexId}' on board '${boardId}'.`);
  }
  const vertexSpaceIds = new Set(vertex.spaceIds);
  return tiledBoard.edges
    .filter((edge) =>
      edge.spaceIds.every((spaceId) => vertexSpaceIds.has(spaceId)),
    )
    .map((edge) => edge.id as TiledEdgeIdOfTable<Table, BoardId>);
}

export function getIncidentVertices<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  EdgeId extends TiledEdgeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  edgeId: EdgeId,
): TiledVertexIdOfTable<Table, BoardId>[] {
  const tiledBoard = getTiledBoard(table, boardId);
  const edge = tiledBoard.edges.find((candidate) => candidate.id === edgeId);
  if (!edge) {
    throw new Error(`Unknown edge '${edgeId}' on board '${boardId}'.`);
  }
  const edgeSpaceIds = new Set(edge.spaceIds);
  return tiledBoard.vertices
    .filter((vertex) =>
      Array.from(edgeSpaceIds).every((spaceId) =>
        vertex.spaceIds.includes(spaceId),
      ),
    )
    .map((vertex) => vertex.id as TiledVertexIdOfTable<Table, BoardId>);
}

export function getRelatedSpaces<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
  TypeId extends RelationTypeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceId,
  relationTypeId: TypeId,
): SpaceId[] {
  const board = getBoard(table, boardId);
  const related = new Set<SpaceId>();

  for (const relation of board.relations) {
    if (relation.typeId !== relationTypeId) {
      continue;
    }
    if (relation.fromSpaceId === spaceId) {
      related.add(relation.toSpaceId as SpaceId);
      continue;
    }
    if (!relation.directed && relation.toSpaceId === spaceId) {
      related.add(relation.fromSpaceId as SpaceId);
    }
  }

  return [...related];
}

export function getAdjacentSpaces<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
>(table: Table, boardId: BoardId, spaceId: SpaceId): SpaceId[] {
  return getRelatedSpaces(
    table,
    boardId,
    spaceId,
    "adjacent" as RelationTypeIdOfTable<NoInfer<Table>, BoardId>,
  );
}

export function getSpaceDistance<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  fromSpaceId: SpaceId,
  toSpaceId: SpaceId,
): number {
  if (fromSpaceId === toSpaceId) {
    return 0;
  }

  const visited = new Set<string>([fromSpaceId]);
  let frontier: string[] = [fromSpaceId];
  let distance = 0;

  while (frontier.length > 0) {
    distance += 1;
    const nextFrontier: string[] = [];

    for (const currentSpaceId of frontier) {
      for (const neighborId of getAdjacentSpaces(
        table,
        boardId,
        currentSpaceId as SpaceId,
      )) {
        if (neighborId === toSpaceId) {
          return distance;
        }
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          nextFrontier.push(neighborId);
        }
      }
    }

    frontier = nextFrontier;
  }

  return Number.POSITIVE_INFINITY;
}

export function getSquareNeighbors<
  Table extends RuntimeTableRecord,
  BoardId extends SquareBoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SquareSpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceId,
  options: { mode?: "orthogonal" | "diagonal" | "all" } = {},
): SquareSpaceIdOfTable<Table, BoardId>[] {
  const board = getSquareBoard(table, boardId);
  const space = getSquareSpace(table, boardId, spaceId);
  const offsets: ReadonlyArray<readonly [number, number]> =
    options.mode === "diagonal"
      ? [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ]
      : options.mode === "all"
        ? [
            [-1, 0],
            [0, 1],
            [1, 0],
            [0, -1],
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ]
        : [
            [-1, 0],
            [0, 1],
            [1, 0],
            [0, -1],
          ];

  return offsets
    .map(([rowOffset, colOffset]) =>
      Object.values(board.spaces).find(
        (candidate) =>
          candidate.row === space.row + rowOffset &&
          candidate.col === space.col + colOffset,
      ),
    )
    .filter((candidate): candidate is typeof space => candidate !== undefined)
    .map((candidate) => candidate.id as SquareSpaceIdOfTable<Table, BoardId>);
}

export function getSquareDistance<
  Table extends RuntimeTableRecord,
  BoardId extends SquareBoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SquareSpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  fromSpaceId: SpaceId,
  toSpaceId: SpaceId,
  options: { metric?: "manhattan" | "chebyshev" } = {},
): number {
  const from = getSquareSpace(table, boardId, fromSpaceId);
  const to = getSquareSpace(table, boardId, toSpaceId);
  const rowDistance = Math.abs(from.row - to.row);
  const colDistance = Math.abs(from.col - to.col);

  return options.metric === "chebyshev"
    ? Math.max(rowDistance, colDistance)
    : rowDistance + colDistance;
}

export function getBoardsByTypeId<
  Table extends RuntimeTableRecord,
  TypeId extends BoardTypeIdOfTable<NoInfer<Table>>,
>(table: Table, typeId: TypeId): BoardIdOfTable<Table>[] {
  return Object.entries(table.boards.byId)
    .filter(([, board]) => board.typeId === typeId)
    .map(([boardId]) => boardId as BoardIdOfTable<Table>);
}

export function getSpacesByTypeId<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  TypeId extends SpaceTypeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  typeId: TypeId,
): SpaceIdOfTable<Table, BoardId>[] {
  return Object.entries(getBoard(table, boardId).spaces)
    .filter(([, space]) => space.typeId === typeId)
    .map(([spaceId]) => spaceId as SpaceIdOfTable<Table, BoardId>);
}

export function getEdgesByTypeId<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  TypeId extends TiledEdgeTypeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  typeId: TypeId,
): TiledEdgeIdOfTable<Table, BoardId>[] {
  return getTiledBoard(table, boardId)
    .edges.filter((edge) => edge.typeId === typeId)
    .map((edge) => edge.id as TiledEdgeIdOfTable<Table, BoardId>);
}

export function getVerticesByTypeId<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  TypeId extends TiledVertexTypeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  typeId: TypeId,
): TiledVertexIdOfTable<Table, BoardId>[] {
  return getTiledBoard(table, boardId)
    .vertices.filter((vertex) => vertex.typeId === typeId)
    .map((vertex) => vertex.id as TiledVertexIdOfTable<Table, BoardId>);
}

export function getComponentsOnSpace<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  spaceId: SpaceId,
): ComponentIdOfTable<Table>[] {
  const zoneId = getSpace(table, boardId, spaceId).zoneId;
  return orderedComponentIdsForLocation(
    table,
    (location) =>
      (location.type === "OnSpace" &&
        location.boardId === boardId &&
        location.spaceId === spaceId) ||
      (location.type === "InZone" &&
        typeof zoneId === "string" &&
        zoneId.length > 0 &&
        location.zoneId === zoneId),
  ) as ComponentIdOfTable<Table>[];
}

export function getComponentsInContainer<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  ContainerId extends BoardContainerIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  containerId: ContainerId,
): ComponentIdOfTable<Table>[] {
  const zoneId = getContainer(table, boardId, containerId).zoneId;
  return orderedComponentIdsForLocation(
    table,
    (location) =>
      (location.type === "InContainer" &&
        location.boardId === boardId &&
        location.containerId === containerId) ||
      (location.type === "InZone" &&
        typeof zoneId === "string" &&
        zoneId.length > 0 &&
        location.zoneId === zoneId),
  ) as ComponentIdOfTable<Table>[];
}

export function getComponentsOnEdge<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  EdgeId extends TiledEdgeIdOfTable<NoInfer<Table>, BoardId>,
>(table: Table, boardId: BoardId, edgeId: EdgeId): ComponentIdOfTable<Table>[] {
  return orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "OnEdge" &&
      location.boardId === boardId &&
      location.edgeId === edgeId,
  ) as ComponentIdOfTable<Table>[];
}

export function getComponentsOnVertex<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  VertexId extends TiledVertexIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  boardId: BoardId,
  vertexId: VertexId,
): ComponentIdOfTable<Table>[] {
  return orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "OnVertex" &&
      location.boardId === boardId &&
      location.vertexId === vertexId,
  ) as ComponentIdOfTable<Table>[];
}
