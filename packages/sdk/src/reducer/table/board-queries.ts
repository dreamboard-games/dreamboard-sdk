import {
  createBoardTopologyCache,
  type BoardTopology,
  type GenericBoardTopology,
  type BoardSpace,
  type HexSpace,
  type SquareSpace,
  type HexBoardTopology,
  type SquareBoardTopology,
  type TiledBoardTopology,
} from "../../shared/board-topology.js";
import {
  createHexTopology,
  createHexTopologyCache,
} from "../../shared/hex-board.js";
import type { TopologyDefinitions } from "../../shared/domain/topology-definitions.js";
import type { BoardTopologyOf } from "../model/topology.js";
import type {
  BoardIdOfTable,
  ComponentIdOfTable,
  RuntimeQueryTable,
} from "../model";
import { orderedComponentIdsForLocation } from "./internal";

const geometryOf = createHexTopologyCache();
const topologyOf = createBoardTopologyCache();
export function getBoard(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
) {
  return topologyOf(table, definitions, boardId);
}
export function getHexBoard(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
): HexBoardTopology {
  const board = getBoard(table, definitions, boardId);
  if (board.layout !== "hex") throw new Error(`Board '${boardId}' is not hex.`);
  return board;
}
export function getSquareBoard(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
): SquareBoardTopology {
  const board = getBoard(table, definitions, boardId);
  if (board.layout !== "square")
    throw new Error(`Board '${boardId}' is not square.`);
  return board;
}
export function getTiledBoard(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
): TiledBoardTopology {
  const board = getBoard(table, definitions, boardId);
  if (board.layout === "generic")
    throw new Error(`Board '${boardId}' is not tiled.`);
  return board;
}
function requireSpace(board: HexBoardTopology, id: string): HexSpace;
function requireSpace(board: SquareBoardTopology, id: string): SquareSpace;
function requireSpace(board: GenericBoardTopology, id: string): BoardSpace;
function requireSpace(
  board: BoardTopology,
  id: string,
): BoardSpace | HexSpace | SquareSpace;
function requireSpace(
  board: BoardTopology,
  id: string,
): BoardSpace | HexSpace | SquareSpace {
  if (!Object.hasOwn(board.spaces, id))
    throw new Error(`Unknown space '${id}' on board '${board.id}'.`);
  return board.spaces[id];
}
export function getSpace(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  spaceId: string,
) {
  return requireSpace(getBoard(table, definitions, boardId), spaceId);
}
export function getHexSpace(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  spaceId: string,
) {
  return requireSpace(getHexBoard(table, definitions, boardId), spaceId);
}
export function getSquareSpace(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  spaceId: string,
) {
  return requireSpace(getSquareBoard(table, definitions, boardId), spaceId);
}
export function getHexSpaceAt(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  q: number,
  r: number,
) {
  return (
    Object.values(getHexBoard(table, definitions, boardId).spaces).find(
      (space) => space.q === q && space.r === r,
    ) ?? null
  );
}
export function getSquareSpaceAt(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  row: number,
  col: number,
) {
  return (
    Object.values(getSquareBoard(table, definitions, boardId).spaces).find(
      (space) => space.row === row && space.col === col,
    ) ?? null
  );
}
export function getEdge(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  edgeId: string,
) {
  const edge = getTiledBoard(table, definitions, boardId).edges.find(
    (edge) => edge.id === edgeId,
  );
  if (!edge) throw new Error(`Unknown edge '${edgeId}' on board '${boardId}'.`);
  return edge;
}
export function getVertex(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  vertexId: string,
) {
  const vertex = getTiledBoard(table, definitions, boardId).vertices.find(
    (vertex) => vertex.id === vertexId,
  );
  if (!vertex)
    throw new Error(`Unknown vertex '${vertexId}' on board '${boardId}'.`);
  return vertex;
}
export function getSpaceEdges(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  spaceId: string,
) {
  const board = getTiledBoard(table, definitions, boardId);
  requireSpace(board, spaceId);
  return board.edges
    .filter((edge) => edge.spaceIds.includes(spaceId))
    .map((edge) => edge.id);
}
export function getSpaceVertices(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  spaceId: string,
) {
  const board = getTiledBoard(table, definitions, boardId);
  requireSpace(board, spaceId);
  return board.vertices
    .filter((vertex) => vertex.spaceIds.includes(spaceId))
    .map((vertex) => vertex.id);
}
export function getIncidentEdges(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  vertexId: string,
) {
  return [...getVertex(table, definitions, boardId, vertexId).edgeIds];
}
export function getIncidentVertices(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  edgeId: string,
) {
  return [...getEdge(table, definitions, boardId, edgeId).vertexIds];
}
function relatedSpaces(board: BoardTopology, spaceId: string, typeId: string) {
  requireSpace(board, spaceId);
  return [
    ...new Set(
      board.relations.flatMap((relation) =>
        relation.typeId !== typeId
          ? []
          : relation.fromSpaceId === spaceId
            ? [relation.toSpaceId]
            : !relation.directed && relation.toSpaceId === spaceId
              ? [relation.fromSpaceId]
              : [],
      ),
    ),
  ];
}
export function getRelatedSpaces(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  spaceId: string,
  typeId: string,
) {
  return relatedSpaces(getBoard(table, definitions, boardId), spaceId, typeId);
}
function squareNeighbors(
  board: SquareBoardTopology,
  id: string,
  options: { mode?: "orthogonal" | "diagonal" | "all" } = {},
) {
  const space = requireSpace(board, id);
  return Object.values(board.spaces)
    .filter((candidate) => {
      const x = Math.abs(candidate.col - space.col),
        y = Math.abs(candidate.row - space.row);
      return options.mode === "diagonal"
        ? x === 1 && y === 1
        : options.mode === "all"
          ? Math.max(x, y) === 1
          : x + y === 1;
    })
    .map((space) => space.id);
}
function neighbors(board: BoardTopology, id: string): string[] {
  requireSpace(board, id);
  if (board.layout === "hex")
    return geometryOf({
      ...board,
      spaces: Object.values(board.spaces),
    }).neighbors(id);
  if (board.layout === "square") return squareNeighbors(board, id);
  return relatedSpaces(board, id, "adjacent");
}
export function getAdjacentSpaces(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  id: string,
) {
  return neighbors(getBoard(table, definitions, boardId), id);
}
function distance(board: BoardTopology, from: string, to: string): number {
  requireSpace(board, from);
  requireSpace(board, to);
  const queue = [from],
    distances = new Map([[from, 0]]);
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index],
      value = distances.get(id)!;
    if (id === to) return value;
    for (const next of neighbors(board, id))
      if (!distances.has(next)) {
        distances.set(next, value + 1);
        queue.push(next);
      }
  }
  return Number.POSITIVE_INFINITY;
}
export function getSpaceDistance(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  from: string,
  to: string,
) {
  return distance(getBoard(table, definitions, boardId), from, to);
}
export function getSquareNeighbors(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  id: string,
  options?: { mode?: "orthogonal" | "diagonal" | "all" },
) {
  return squareNeighbors(
    getSquareBoard(table, definitions, boardId),
    id,
    options,
  );
}
export function getSquareDistance(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  from: string,
  to: string,
  options: { metric?: "manhattan" | "chebyshev" } = {},
) {
  const board = getSquareBoard(table, definitions, boardId),
    a = requireSpace(board, from),
    b = requireSpace(board, to);
  const x = Math.abs(a.col - b.col),
    y = Math.abs(a.row - b.row);
  return options.metric === "chebyshev" ? Math.max(x, y) : x + y;
}
export function getBoardsByTypeId(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  typeId: string,
) {
  return Object.keys(table.boards).filter(
    (id) => getBoard(table, definitions, id).typeId === typeId,
  );
}
export function getSpacesByTypeId(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  typeId: string,
) {
  return Object.values(getBoard(table, definitions, boardId).spaces)
    .filter((space) => space.typeId === typeId)
    .map((space) => space.id);
}
export function getEdgesByTypeId(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  typeId: string,
) {
  return getTiledBoard(table, definitions, boardId)
    .edges.filter((edge) => edge.typeId === typeId)
    .map((edge) => edge.id);
}
export function getVerticesByTypeId(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  typeId: string,
) {
  return getTiledBoard(table, definitions, boardId)
    .vertices.filter((vertex) => vertex.typeId === typeId)
    .map((vertex) => vertex.id);
}
export function getComponentsOnSpace(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  spaceId: string,
) {
  getSpace(table, definitions, boardId, spaceId);
  return orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "OnSpace" &&
      location.boardId === boardId &&
      location.spaceId === spaceId,
  );
}
export function getComponentsOnEdge(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  edgeId: string,
) {
  getEdge(table, definitions, boardId, edgeId);
  return orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "OnEdge" &&
      location.boardId === boardId &&
      location.edgeId === edgeId,
  );
}
export function getComponentsOnVertex(
  table: RuntimeQueryTable,
  definitions: TopologyDefinitions,
  boardId: string,
  vertexId: string,
) {
  getVertex(table, definitions, boardId, vertexId);
  return orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "OnVertex" &&
      location.boardId === boardId &&
      location.vertexId === vertexId,
  );
}
export function bindBoardQueries<
  Table extends RuntimeQueryTable,
  Definitions extends TopologyDefinitions,
  BoardId extends BoardIdOfTable<Table>,
>(
  table: Table,
  definitions: Definitions,
  boardId: BoardId,
): BoundBoardQueries<
  BoardTopologyOf<Table, Definitions, BoardId>,
  ComponentIdOfTable<Table>
> {
  const state = getBoard(table, definitions, boardId);
  const common = {
    state,
    space: (id: string) => requireSpace(state, id),
    spacesByType: (typeId: string) =>
      Object.values(state.spaces)
        .filter((space) => space.typeId === typeId)
        .map((space) => space.id),
    relatedSpaces: (id: string, typeId: string) =>
      relatedSpaces(state, id, typeId),
    neighbors: (id: string) => neighbors(state, id),
    distance: (from: string, to: string) => distance(state, from, to),
    spaceOccupants: (id: string) =>
      getComponentsOnSpace(table, definitions, boardId, id),
  };
  let result: unknown = common;
  if (state.layout === "hex") {
    const {
      edgesOf: spaceEdges,
      verticesOf: spaceVertices,
      incidentEdges: edgesOf,
      incidentVertices: verticesOf,
      ...geometry
    } = geometryOf({ ...state, spaces: Object.values(state.spaces) });
    result = {
      ...common,
      ...geometry,
      spaceEdges,
      spaceVertices,
      edgesOf,
      verticesOf,
    };
  } else if (state.layout === "square") {
    result = {
      ...common,
      edgesOf: (id: string) =>
        getIncidentEdges(table, definitions, boardId, id),
      verticesOf: (id: string) =>
        getIncidentVertices(table, definitions, boardId, id),
      spaceEdges: (id: string) =>
        getSpaceEdges(table, definitions, boardId, id),
      spaceVertices: (id: string) =>
        getSpaceVertices(table, definitions, boardId, id),
      spacesAt: (id: string) =>
        getVertex(table, definitions, boardId, id).spaceIds,
      spacesAlong: (id: string) =>
        getEdge(table, definitions, boardId, id).spaceIds,
      neighbors: (
        id: string,
        options?: { mode?: "orthogonal" | "diagonal" | "all" },
      ) => squareNeighbors(state, id, options),
      distance: (
        from: string,
        to: string,
        options?: { metric?: "manhattan" | "chebyshev" },
      ) => getSquareDistance(table, definitions, boardId, from, to, options),
    };
  }

  return result as BoundBoardQueries<
    BoardTopologyOf<Table, Definitions, BoardId>,
    ComponentIdOfTable<Table>
  >;
}
type SpaceType<Space> = Space extends { typeId: infer Type }
  ? Extract<Type, string>
  : Space extends { typeId?: infer Type }
    ? Extract<Type, string>
    : never;
type SpaceId<Board extends BoardTopology> = keyof Board["spaces"] & string;
type CommonBoardQueries<
  Board extends BoardTopology,
  ComponentId extends string,
> = {
  state: Board;
  space<Id extends SpaceId<Board>>(id: Id): Board["spaces"][Id];
  spacesByType(
    id: SpaceType<Board["spaces"][keyof Board["spaces"]]>,
  ): SpaceId<Board>[];
  relatedSpaces(
    id: SpaceId<Board>,
    typeId: Board["relations"][number]["typeId"],
  ): SpaceId<Board>[];
  neighbors(id: SpaceId<Board>): SpaceId<Board>[];
  distance(from: SpaceId<Board>, to: SpaceId<Board>): number;
  spaceOccupants(id: SpaceId<Board>): ComponentId[];
};
type HexQueries<Board extends BoardTopology> = ReturnType<
  typeof createHexTopology<Extract<Board["id"], string>, SpaceId<Board>>
>;
export type BoundBoardQueries<
  Board extends BoardTopology,
  ComponentId extends string,
> = CommonBoardQueries<Board, ComponentId> &
  (Board extends { layout: "hex" }
    ? Omit<
        HexQueries<Board>,
        "edgesOf" | "verticesOf" | "incidentEdges" | "incidentVertices"
      > & {
        spaceEdges: HexQueries<Board>["edgesOf"];
        spaceVertices: HexQueries<Board>["verticesOf"];
        edgesOf: HexQueries<Board>["incidentEdges"];
        verticesOf: HexQueries<Board>["incidentVertices"];
      }
    : Board extends {
          layout: "square";
          edges: readonly { id: infer EdgeId extends string }[];
          vertices: readonly { id: infer VertexId extends string }[];
        }
      ? {
          edgesOf(id: VertexId): EdgeId[];
          verticesOf(id: EdgeId): VertexId[];
          spaceEdges(id: SpaceId<Board>): EdgeId[];
          spaceVertices(id: SpaceId<Board>): VertexId[];
          spacesAt(id: VertexId): SpaceId<Board>[];
          spacesAlong(id: EdgeId): SpaceId<Board>[];
          neighbors(
            id: SpaceId<Board>,
            options?: { mode?: "orthogonal" | "diagonal" | "all" },
          ): SpaceId<Board>[];
          distance(
            from: SpaceId<Board>,
            to: SpaceId<Board>,
            options?: { metric?: "manhattan" | "chebyshev" },
          ): number;
        }
      : unknown);
