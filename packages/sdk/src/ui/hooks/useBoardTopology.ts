import { useCallback, useMemo } from "react";
import type {
  AnyHexBoardInput,
  AnySquareBoardInput,
  BoardEdgeIdOf,
  BoardSpaceIdOf,
  BoardVertexIdOf,
  NormalizedHexBoard,
  NormalizedHexEdgeOf,
  NormalizedHexTileOf,
  NormalizedHexVertexOf,
  NormalizedSquareBoard,
  NormalizedSquareCellOf,
  NormalizedSquareEdgeOf,
  NormalizedSquareVertexOf,
} from "../types/tiled-board.js";
import {
  isGeneratedHexBoardInput,
  normalizeHexBoardInput,
  normalizeSquareBoardInput,
} from "../types/tiled-board.js";

type BoardTopologyData = AnyHexBoardInput | AnySquareBoardInput;

type BoardSpaceOf<TBoard extends BoardTopologyData> =
  TBoard extends AnyHexBoardInput
    ? NormalizedHexTileOf<TBoard>
    : TBoard extends AnySquareBoardInput
      ? NormalizedSquareCellOf<TBoard>
      : never;

type BoardEdgeOf<TBoard extends BoardTopologyData> =
  TBoard extends AnyHexBoardInput
    ? NormalizedHexEdgeOf<TBoard>
    : TBoard extends AnySquareBoardInput
      ? NormalizedSquareEdgeOf<TBoard>
      : never;

type BoardVertexOf<TBoard extends BoardTopologyData> =
  TBoard extends AnyHexBoardInput
    ? NormalizedHexVertexOf<TBoard>
    : TBoard extends AnySquareBoardInput
      ? NormalizedSquareVertexOf<TBoard>
      : never;

type NormalizedBoardOf<TBoard extends BoardTopologyData> =
  TBoard extends AnyHexBoardInput
    ? NormalizedHexBoard<TBoard>
    : TBoard extends AnySquareBoardInput
      ? NormalizedSquareBoard<TBoard>
      : never;

type BoardLayoutOf<TBoard extends BoardTopologyData> =
  TBoard extends AnyHexBoardInput ? "hex" : "square";

function toSpaceIds<TBoard extends BoardTopologyData>(
  edge: BoardEdgeOf<TBoard>,
): ReadonlyArray<BoardSpaceIdOf<TBoard>> {
  if ("spaceIds" in edge) {
    return edge.spaceIds as ReadonlyArray<BoardSpaceIdOf<TBoard>>;
  }
  return [edge.hex1, edge.hex2] as unknown as ReadonlyArray<
    BoardSpaceIdOf<TBoard>
  >;
}

function toVertexSpaceIds<TBoard extends BoardTopologyData>(
  vertex: BoardVertexOf<TBoard>,
): ReadonlyArray<BoardSpaceIdOf<TBoard>> {
  if ("spaceIds" in vertex) {
    return vertex.spaceIds as ReadonlyArray<BoardSpaceIdOf<TBoard>>;
  }
  return vertex.hexes as ReadonlyArray<BoardSpaceIdOf<TBoard>>;
}

export interface UseBoardTopologyReturn<TBoard extends BoardTopologyData> {
  layout: BoardLayoutOf<TBoard>;
  board: NormalizedBoardOf<TBoard>;
  getSpace: (
    spaceId: BoardSpaceIdOf<TBoard>,
  ) => BoardSpaceOf<TBoard> | undefined;
  getEdge: (edgeId: BoardEdgeIdOf<TBoard>) => BoardEdgeOf<TBoard> | undefined;
  getVertex: (
    vertexId: BoardVertexIdOf<TBoard>,
  ) => BoardVertexOf<TBoard> | undefined;
  getAdjacentSpaces: (
    spaceId: BoardSpaceIdOf<TBoard>,
  ) => Array<BoardSpaceOf<TBoard>>;
  getDistance: (
    fromSpaceId: BoardSpaceIdOf<TBoard>,
    toSpaceId: BoardSpaceIdOf<TBoard>,
  ) => number;
  getSpaceEdges: (
    spaceId: BoardSpaceIdOf<TBoard>,
  ) => Array<BoardEdgeOf<TBoard>>;
  getSpaceVertices: (
    spaceId: BoardSpaceIdOf<TBoard>,
  ) => Array<BoardVertexOf<TBoard>>;
  getIncidentEdges: (
    vertexId: BoardVertexIdOf<TBoard>,
  ) => Array<BoardEdgeOf<TBoard>>;
  getIncidentVertices: (
    edgeId: BoardEdgeIdOf<TBoard>,
  ) => Array<BoardVertexOf<TBoard>>;
}

export function useBoardTopology<const TBoard extends BoardTopologyData>(
  board: TBoard,
): UseBoardTopologyReturn<TBoard> {
  const normalizedBoard = useMemo<NormalizedBoardOf<TBoard>>(() => {
    const candidateBoard = board as BoardTopologyData;

    if (isGeneratedHexBoardInput(candidateBoard) || "tiles" in candidateBoard) {
      return normalizeHexBoardInput(
        candidateBoard as AnyHexBoardInput,
      ) as NormalizedBoardOf<TBoard>;
    }
    return normalizeSquareBoardInput(
      candidateBoard as AnySquareBoardInput,
    ) as NormalizedBoardOf<TBoard>;
  }, [board]);

  const layout = (
    "tiles" in normalizedBoard ? "hex" : "square"
  ) as BoardLayoutOf<TBoard>;
  const spaces = useMemo(
    () =>
      ("tiles" in normalizedBoard
        ? normalizedBoard.tiles
        : normalizedBoard.cells) as Array<BoardSpaceOf<TBoard>>,
    [normalizedBoard],
  );
  const edges = useMemo(
    () => normalizedBoard.edges as Array<BoardEdgeOf<TBoard>>,
    [normalizedBoard.edges],
  );
  const vertices = useMemo(
    () => normalizedBoard.vertices as Array<BoardVertexOf<TBoard>>,
    [normalizedBoard.vertices],
  );

  const spaceById = useMemo(
    () =>
      new Map<BoardSpaceIdOf<TBoard>, BoardSpaceOf<TBoard>>(
        spaces.map((space) => [space.id as BoardSpaceIdOf<TBoard>, space]),
      ),
    [spaces],
  );
  const edgeById = useMemo(
    () =>
      new Map<BoardEdgeIdOf<TBoard>, BoardEdgeOf<TBoard>>(
        edges.map((edge) => [edge.id as BoardEdgeIdOf<TBoard>, edge]),
      ),
    [edges],
  );
  const vertexById = useMemo(
    () =>
      new Map<BoardVertexIdOf<TBoard>, BoardVertexOf<TBoard>>(
        vertices.map((vertex) => [
          vertex.id as BoardVertexIdOf<TBoard>,
          vertex,
        ]),
      ),
    [vertices],
  );

  const adjacentSpaceIdsById = useMemo(() => {
    const adjacency = new Map<
      BoardSpaceIdOf<TBoard>,
      Array<BoardSpaceIdOf<TBoard>>
    >();
    for (const space of spaces) {
      adjacency.set(space.id as BoardSpaceIdOf<TBoard>, []);
    }
    for (const edge of edges) {
      const spaceIds = toSpaceIds(edge);
      if (spaceIds.length !== 2) {
        continue;
      }
      const [leftId, rightId] = spaceIds;
      if (!leftId || !rightId) {
        continue;
      }
      adjacency.set(leftId, [...(adjacency.get(leftId) ?? []), rightId]);
      adjacency.set(rightId, [...(adjacency.get(rightId) ?? []), leftId]);
    }
    return adjacency;
  }, [edges, spaces]);

  const getSpace = useCallback(
    (spaceId: BoardSpaceIdOf<TBoard>) => {
      return spaceById.get(spaceId);
    },
    [spaceById],
  );

  const getEdge = useCallback(
    (edgeId: BoardEdgeIdOf<TBoard>) => {
      return edgeById.get(edgeId);
    },
    [edgeById],
  );

  const getVertex = useCallback(
    (vertexId: BoardVertexIdOf<TBoard>) => {
      return vertexById.get(vertexId);
    },
    [vertexById],
  );

  const getAdjacentSpaces = useCallback(
    (spaceId: BoardSpaceIdOf<TBoard>) => {
      return (adjacentSpaceIdsById.get(spaceId) ?? [])
        .map((adjacentSpaceId) => spaceById.get(adjacentSpaceId))
        .filter((space): space is BoardSpaceOf<TBoard> => space !== undefined);
    },
    [adjacentSpaceIdsById, spaceById],
  );

  const getDistance = useCallback(
    (
      fromSpaceId: BoardSpaceIdOf<TBoard>,
      toSpaceId: BoardSpaceIdOf<TBoard>,
    ) => {
      if (fromSpaceId === toSpaceId) {
        return 0;
      }

      const visited = new Set<BoardSpaceIdOf<TBoard>>([fromSpaceId]);
      let frontier = [fromSpaceId];
      let distance = 0;

      while (frontier.length > 0) {
        distance += 1;
        const nextFrontier: Array<BoardSpaceIdOf<TBoard>> = [];
        for (const currentSpaceId of frontier) {
          for (const adjacentSpaceId of adjacentSpaceIdsById.get(
            currentSpaceId,
          ) ?? []) {
            if (adjacentSpaceId === toSpaceId) {
              return distance;
            }
            if (!visited.has(adjacentSpaceId)) {
              visited.add(adjacentSpaceId);
              nextFrontier.push(adjacentSpaceId);
            }
          }
        }
        frontier = nextFrontier;
      }

      return Number.POSITIVE_INFINITY;
    },
    [adjacentSpaceIdsById],
  );

  const getSpaceEdges = useCallback(
    (spaceId: BoardSpaceIdOf<TBoard>) => {
      return edges.filter((edge) => toSpaceIds(edge).includes(spaceId));
    },
    [edges],
  );

  const getSpaceVertices = useCallback(
    (spaceId: BoardSpaceIdOf<TBoard>) => {
      return vertices.filter((vertex) =>
        toVertexSpaceIds(vertex).includes(spaceId),
      );
    },
    [vertices],
  );

  const getIncidentEdges = useCallback(
    (vertexId: BoardVertexIdOf<TBoard>) => {
      const vertex = vertexById.get(vertexId);
      if (!vertex) {
        return [];
      }
      const vertexSpaceIds = new Set(toVertexSpaceIds(vertex));
      return edges.filter((edge) =>
        toSpaceIds(edge).every((spaceId) => vertexSpaceIds.has(spaceId)),
      );
    },
    [edges, vertexById],
  );

  const getIncidentVertices = useCallback(
    (edgeId: BoardEdgeIdOf<TBoard>) => {
      const edge = edgeById.get(edgeId);
      if (!edge) {
        return [];
      }
      const edgeSpaceIds = new Set(toSpaceIds(edge));
      return vertices.filter((vertex) =>
        Array.from(edgeSpaceIds).every((spaceId) =>
          toVertexSpaceIds(vertex).includes(spaceId),
        ),
      );
    },
    [edgeById, vertices],
  );

  return {
    layout,
    board: normalizedBoard,
    getSpace,
    getEdge,
    getVertex,
    getAdjacentSpaces,
    getDistance,
    getSpaceEdges,
    getSpaceVertices,
    getIncidentEdges,
    getIncidentVertices,
  };
}
