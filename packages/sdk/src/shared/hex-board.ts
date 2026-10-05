import { boardEdgeId, boardVertexId } from "./domain/board-element.js";
import { MAXIMUM_BOARD_COORDINATE } from "./domain/board-coordinates.js";
import type { BoardEdgeId, BoardVertexId } from "./domain/board-identities.js";
import {
  defineHex,
  Grid,
  Orientation,
  ring as ringTraversal,
  line as lineTraversal,
  type Point,
} from "honeycomb-grid";

export type AxialCoordinate = { readonly q: number; readonly r: number };
export type HexBoardOrientation =
  import("./board-topology-schema.js").HexBoardTopology["orientation"];
export type HexBoardSpace<Id extends string = string> = AxialCoordinate & {
  id: Id;
};
// Cube-coordinate sums and pairwise differences remain exact in this domain.
const maximumCoordinate = MAXIMUM_BOARD_COORDINATE;
const coordinateKey = ({ q, r }: AxialCoordinate) => `${q},${r}`;
const directions: readonly AxialCoordinate[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
];
const add = (a: AxialCoordinate, b: AxialCoordinate): AxialCoordinate => ({
  q: a.q + b.q,
  r: a.r + b.r,
});
function edgeKey(hex: AxialCoordinate, side: number): string {
  return side < 3
    ? `${coordinateKey(hex)}:e${side}`
    : edgeKey(add(hex, directions[side]), side - 3);
}
function vertexCoordinates(hex: AxialCoordinate, corner: number) {
  return [
    hex,
    add(hex, directions[corner]),
    add(hex, directions[(corner + 1) % 6]),
  ];
}
function vertexKey(hex: AxialCoordinate, corner: number): string {
  const hexes = vertexCoordinates(hex, corner);
  for (const base of hexes) {
    for (let shape = 0; shape < 2; shape++) {
      if (
        [directions[shape], directions[shape + 1]].every((offset) =>
          hexes.some(
            (hex) => coordinateKey(hex) === coordinateKey(add(base, offset)),
          ),
        )
      )
        return `${coordinateKey(base)}:v${shape}`;
    }
  }
  throw new Error("Invalid hex vertex.");
}
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function hexClass(orientation: HexBoardOrientation, dimensions = 1) {
  return defineHex({
    dimensions,
    orientation: orientation === "flat" ? Orientation.FLAT : Orientation.POINTY,
    origin: { x: 0, y: 0 },
  });
}

export type HexTopologyEdge<BoardId extends string> = {
  id: BoardEdgeId<BoardId>;
  spaceIds: string[];
  vertexIds: [BoardVertexId<BoardId>, BoardVertexId<BoardId>];
};
export type HexTopologyVertex<BoardId extends string> = {
  id: BoardVertexId<BoardId>;
  spaceIds: string[];
  edgeIds: BoardEdgeId<BoardId>[];
};

/** One immutable topology for materialization, rules, layout, and hit testing. */
export function createHexTopology<
  const BoardId extends string,
  SpaceId extends string,
>(board: {
  id: BoardId;
  orientation?: HexBoardOrientation;
  spaces: readonly HexBoardSpace<SpaceId>[];
}) {
  const boardId = board.id;
  const spaces = board.spaces
    .map(({ id, q, r }) => ({ id, q, r }))
    .sort((a, b) => compare(a.id, b.id));
  for (const space of spaces) {
    if (!Number.isSafeInteger(space.q) || !Number.isSafeInteger(space.r))
      throw new Error("Hex coordinates must be safe integers.");
    if (
      Math.abs(space.q) > maximumCoordinate ||
      Math.abs(space.r) > maximumCoordinate
    )
      throw new Error(
        `Hex coordinates must be within +/-${maximumCoordinate} for exact cube arithmetic and safe one-step neighbours.`,
      );
  }
  const orientation = board.orientation ?? "pointy";
  const grid = new Grid(hexClass(orientation), spaces);
  const spacesById = new Map(spaces.map((space) => [space.id, space]));
  if (spacesById.size !== spaces.length || grid.size !== spaces.length)
    throw new Error(
      `Hex board '${boardId}' contains duplicate space IDs or coordinates.`,
    );
  const spacesByCoordinate = new Map(
    spaces.map((space) => [coordinateKey(space), space]),
  );
  const cornersBySpace = new Map<SpaceId, BoardVertexId<BoardId>[]>();
  const edgesBySpace = new Map<SpaceId, BoardEdgeId<BoardId>[]>();
  const edgesById = new Map<BoardEdgeId<BoardId>, HexTopologyEdge<BoardId>>();
  const verticesById = new Map<
    BoardVertexId<BoardId>,
    HexTopologyVertex<BoardId>
  >();
  const vertexPoints = new Map<BoardVertexId<BoardId>, Point>();
  const Tile = hexClass(orientation);
  const cornerId = (space: AxialCoordinate, corner: number) =>
    boardVertexId("hex", boardId, vertexKey(space, corner));
  for (const space of spaces) {
    const cornerIds = Array.from({ length: 6 }, (_, corner) =>
      cornerId(space, corner),
    );
    cornersBySpace.set(space.id, cornerIds);
    const edgeIds = Array.from({ length: 6 }, (_, side) => {
      const id = boardEdgeId("hex", boardId, edgeKey(space, side));
      let edge = edgesById.get(id);
      if (!edge) {
        edge = {
          id,
          spaceIds: [],
          vertexIds: [cornerIds[(side + 5) % 6], cornerIds[side]].sort(
            compare,
          ) as [BoardVertexId<BoardId>, BoardVertexId<BoardId>],
        };
        edgesById.set(id, edge);
      }
      edge.spaceIds.push(space.id);
      return id;
    });
    edgesBySpace.set(space.id, edgeIds);
    cornerIds.forEach((id, corner) => {
      let vertex = verticesById.get(id);
      if (!vertex) {
        vertex = { id, spaceIds: [], edgeIds: [] };
        verticesById.set(id, vertex);
        const centers = vertexCoordinates(space, corner).map(
          (coordinate) => new Tile(coordinate),
        );
        vertexPoints.set(id, {
          x: centers.reduce((sum, hex) => sum + hex.x, 0) / 3,
          y: centers.reduce((sum, hex) => sum + hex.y, 0) / 3,
        });
      }
      vertex.spaceIds.push(space.id);
      for (const edgeId of [edgeIds[corner], edgeIds[(corner + 1) % 6]])
        if (!vertex.edgeIds.includes(edgeId)) vertex.edgeIds.push(edgeId);
    });
  }
  const edges = Object.freeze(
    [...edgesById.values()]
      .sort((a, b) => compare(a.id, b.id))
      .map((edge) =>
        Object.freeze({
          ...edge,
          spaceIds: Object.freeze(edge.spaceIds),
          vertexIds: Object.freeze(edge.vertexIds),
        }),
      ),
  );
  const vertices = Object.freeze(
    [...verticesById.values()]
      .sort((a, b) => compare(a.id, b.id))
      .map((vertex) =>
        Object.freeze({
          ...vertex,
          spaceIds: Object.freeze(vertex.spaceIds),
          edgeIds: Object.freeze(vertex.edgeIds.sort(compare)),
        }),
      ),
  );
  const requireSpace = (id: SpaceId) => {
    const space = spacesById.get(id);
    if (!space) throw new Error(`Unknown space '${id}' on board '${boardId}'.`);
    return space;
  };
  const selectedIds = (coordinates: Iterable<AxialCoordinate>): SpaceId[] =>
    Array.from(coordinates).flatMap((coordinate) => {
      const space = spacesByCoordinate.get(coordinateKey(coordinate));
      return space ? [space.id] : [];
    });
  const topology = {
    edges,
    vertices,
    neighbors(id: SpaceId) {
      const space = requireSpace(id);
      return directions.flatMap((direction) => {
        const neighbor = spacesByCoordinate.get(
          coordinateKey(add(space, direction)),
        );
        return neighbor ? [neighbor.id] : [];
      });
    },
    distance(from: SpaceId, to: SpaceId) {
      requireSpace(from);
      requireSpace(to);
      const queue = [from];
      const distances = new Map<SpaceId, number>([[from, 0]]);
      for (let index = 0; index < queue.length; index++) {
        const id = queue[index];
        const distance = distances.get(id)!;
        if (id === to) return distance;
        const space = requireSpace(id);
        for (const direction of directions) {
          const neighbor = spacesByCoordinate.get(
            coordinateKey(add(space, direction)),
          );
          if (neighbor && !distances.has(neighbor.id)) {
            distances.set(neighbor.id, distance + 1);
            queue.push(neighbor.id);
          }
        }
      }
      return Infinity;
    },
    gridDistance(from: SpaceId, to: SpaceId) {
      return grid.distance(requireSpace(from), requireSpace(to));
    },
    ring(id: SpaceId, radius: number) {
      return selectedIds(
        new Grid(
          hexClass(orientation),
          ringTraversal({ center: requireSpace(id), radius }),
        ),
      );
    },
    line(from: SpaceId, to: SpaceId) {
      return selectedIds(
        new Grid(
          hexClass(orientation),
          lineTraversal({ start: requireSpace(from), stop: requireSpace(to) }),
        ),
      );
    },
    edgesOf(id: SpaceId) {
      requireSpace(id);
      return [...edgesBySpace.get(id)!];
    },
    verticesOf(id: SpaceId) {
      requireSpace(id);
      return [...cornersBySpace.get(id)!];
    },
    edgeAt(id: SpaceId, side: 0 | 1 | 2 | 3 | 4 | 5) {
      requireSpace(id);
      const key = edgesBySpace.get(id)![side];
      if (!key)
        throw new Error("Hex side must be an integer from 0 through 5.");
      return key;
    },
    vertexAt(id: SpaceId, corner: 0 | 1 | 2 | 3 | 4 | 5) {
      requireSpace(id);
      const key = cornersBySpace.get(id)![corner];
      if (!key)
        throw new Error("Hex corner must be an integer from 0 through 5.");
      return key;
    },
    edge(a: SpaceId, b: SpaceId) {
      requireSpace(a);
      requireSpace(b);
      const edge = edgesBySpace
        .get(a)!
        .map((id) => edgesById.get(id)!)
        .find((edge) => edge.spaceIds.includes(b));
      if (!edge || a === b)
        throw new Error(`Spaces '${a}' and '${b}' do not share an edge.`);
      return edge.id;
    },
    vertex(a: SpaceId, b: SpaceId, c: SpaceId) {
      requireSpace(a);
      requireSpace(b);
      requireSpace(c);
      const vertex = cornersBySpace
        .get(a)!
        .map((id) => verticesById.get(id)!)
        .find(
          (vertex) =>
            vertex.spaceIds.includes(b) && vertex.spaceIds.includes(c),
        );
      if (!vertex || new Set([a, b, c]).size !== 3)
        throw new Error("Spaces do not share exactly one vertex.");
      return vertex.id;
    },
    incidentEdges(vertexId: BoardVertexId<BoardId>) {
      const vertex = verticesById.get(vertexId);
      if (!vertex) throw new Error(`Unknown vertex '${vertexId}'.`);
      return [...vertex.edgeIds];
    },
    incidentVertices(edgeId: BoardEdgeId<BoardId>) {
      const edge = edgesById.get(edgeId);
      if (!edge) throw new Error(`Unknown edge '${edgeId}'.`);
      return [...edge.vertexIds] as [
        BoardVertexId<BoardId>,
        BoardVertexId<BoardId>,
      ];
    },
    spacesAt(vertexId: BoardVertexId<BoardId>) {
      const vertex = verticesById.get(vertexId);
      if (!vertex) throw new Error(`Unknown vertex '${vertexId}'.`);
      return [...vertex.spaceIds] as SpaceId[];
    },
    spacesAlong(edgeId: BoardEdgeId<BoardId>) {
      const edge = edgesById.get(edgeId);
      if (!edge) throw new Error(`Unknown edge '${edgeId}'.`);
      return [...edge.spaceIds] as SpaceId[];
    },
    getLayout({
      hexSize,
      origin: suppliedOrigin = { x: 0, y: 0 },
    }: {
      hexSize: number;
      origin?: Point;
    }) {
      const origin = { x: suppliedOrigin.x, y: suppliedOrigin.y };
      if (!Number.isFinite(hexSize) || hexSize <= 0)
        throw new Error("hexSize must be positive and finite.");
      if (![origin.x, origin.y].every(Number.isFinite))
        throw new Error("Layout origin must be finite.");
      const scaled = new Grid(hexClass(orientation, hexSize), spaces);
      const layoutSpaces = spaces.map((space) => {
        const hex = scaled.getHex(space)!;
        return {
          id: space.id,
          center: { x: hex.x + origin.x, y: hex.y + origin.y },
          corners: hex.corners.map((point) => ({
            x: point.x + origin.x,
            y: point.y + origin.y,
          })),
        };
      });
      const points = layoutSpaces.flatMap((space) => space.corners);
      const minX = points.length
        ? Math.min(...points.map((point) => point.x))
        : 0;
      const minY = points.length
        ? Math.min(...points.map((point) => point.y))
        : 0;
      const maxX = points.length
        ? Math.max(...points.map((point) => point.x))
        : 0;
      const maxY = points.length
        ? Math.max(...points.map((point) => point.y))
        : 0;
      const scaledVertexPoints = new Map(
        [...vertexPoints].map(([id, point]) => [
          id,
          { x: point.x * hexSize + origin.x, y: point.y * hexSize + origin.y },
        ]),
      );
      return {
        viewBox: Object.freeze({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        }),
        spaces: Object.freeze(
          layoutSpaces.map((space) =>
            Object.freeze({
              ...space,
              center: Object.freeze(space.center),
              corners: Object.freeze(
                space.corners.map((point) => Object.freeze(point)),
              ),
            }),
          ),
        ),
        edges: Object.freeze(
          edges.map((edge) =>
            Object.freeze({
              id: edge.id,
              from: Object.freeze(scaledVertexPoints.get(edge.vertexIds[0])!),
              to: Object.freeze(scaledVertexPoints.get(edge.vertexIds[1])!),
            }),
          ),
        ),
        vertices: Object.freeze(
          vertices.map((vertex) =>
            Object.freeze({
              id: vertex.id,
              center: Object.freeze(scaledVertexPoints.get(vertex.id)!),
            }),
          ),
        ),
        pointToSpace(point: Point) {
          const hex = scaled.pointToHex(
            { x: point.x - origin.x, y: point.y - origin.y },
            { allowOutside: false },
          );
          return hex
            ? spacesByCoordinate.get(coordinateKey(hex))?.id
            : undefined;
        },
      };
    },
  };
  let cachedLayout:
    { key: string; value: ReturnType<typeof topology.getLayout> } | undefined;
  const buildLayout = topology.getLayout;
  topology.getLayout = (options) => {
    const key = JSON.stringify([
      options.hexSize,
      options.origin?.x ?? 0,
      options.origin?.y ?? 0,
    ]);
    if (cachedLayout?.key !== key) {
      const value = buildLayout(options);
      cachedLayout = { key, value: Object.freeze(value) };
    }
    return cachedLayout.value;
  };
  return Object.freeze(topology);
}

/** Geometry cache scoped to its consumer; metadata is never part of topology. */
export function createHexTopologyCache() {
  const entries = new Map<
    string,
    {
      orientation: HexBoardOrientation;
      spaces: Map<string, AxialCoordinate>;
      value: ReturnType<typeof createHexTopology>;
    }
  >();
  return (board: Parameters<typeof createHexTopology>[0]) => {
    const orientation = board.orientation ?? "pointy";
    const cached = entries.get(board.id);
    if (
      cached?.orientation === orientation &&
      cached.spaces.size === board.spaces.length
    ) {
      const seen = new Set<string>();
      const equal = board.spaces.every((space) => {
        const previous = cached.spaces.get(space.id);
        if (seen.has(space.id)) return false;
        seen.add(space.id);
        return previous?.q === space.q && previous?.r === space.r;
      });
      if (equal) return cached.value;
    }
    const value = createHexTopology(board);
    // Keep a bounded working set when games or private board identities change.
    if (!entries.has(board.id) && entries.size >= 64)
      entries.delete(entries.keys().next().value!);
    entries.set(board.id, {
      orientation,
      spaces: new Map(board.spaces.map(({ id, q, r }) => [id, { q, r }])),
      value,
    });
    return value;
  };
}
