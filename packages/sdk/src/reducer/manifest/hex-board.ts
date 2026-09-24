import type {
  HexEdgeId,
  HexVertexId,
} from "../../shared/domain/board-identities.js";
import type {
  HexShape,
  HexCoordinate,
  HexOrientation,
} from "../../shared/domain/contracts.js";
import {
  defineHex,
  Grid,
  Orientation,
  fromCoordinates as coordinatesTraversal,
  rectangle as rectangleTraversal,
  ring as ringTraversal,
  spiral as spiralTraversal,
  line as lineTraversal,
  type Point,
} from "honeycomb-grid";

export type { HexShape } from "../../shared/domain/contracts.js";
export type AxialCoordinate = Readonly<HexCoordinate>;
export const hexagon = (
  options: Omit<Extract<HexShape, { kind: "hexagon" | "spiral" }>, "kind">,
) => ({ kind: "hexagon" as const, ...options });
export const spiral = (
  options: Omit<Extract<HexShape, { kind: "hexagon" | "spiral" }>, "kind">,
) => ({ kind: "spiral" as const, ...options });
export const ring = (
  options: Omit<Extract<HexShape, { kind: "ring" }>, "kind">,
) => ({ kind: "ring" as const, ...options });
export const rectangle = (
  options: Omit<Extract<HexShape, { kind: "rectangle" }>, "kind">,
) => ({ kind: "rectangle" as const, ...options });
export const fromCoordinates = <
  const Coordinates extends readonly AxialCoordinate[],
>(
  coordinates: Coordinates,
) => ({ kind: "coordinates" as const, coordinates });

export type HexBoardOrientation = HexOrientation;
export type HexBoardSpace<Id extends string = string> = AxialCoordinate & {
  id: Id;
};
const coordinateKey = ({ q, r }: AxialCoordinate) => `${q},${r}`;
const pointKey = ({ x, y }: Point) =>
  `${Math.round(x * 1e9)},${Math.round(y * 1e9)}`;
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function hexClass(orientation: HexBoardOrientation, dimensions = 1) {
  return defineHex({
    dimensions,
    orientation: orientation === "flat" ? Orientation.FLAT : Orientation.POINTY,
    origin: { x: 0, y: 0 },
  });
}

/** Generate axial coordinates with the library's traversers. Shapes remain JSON. */
export function hexShapeCoordinates(
  shape: HexShape,
  orientation: HexBoardOrientation = "pointy",
): AxialCoordinate[] {
  const integer = (value: number, name: string, minimum: number) => {
    if (!Number.isSafeInteger(value) || value < minimum)
      throw new Error(`${name} must be a safe integer >= ${minimum}.`);
  };
  const coordinate = (value: AxialCoordinate) => {
    integer(value.q, "q", Number.MIN_SAFE_INTEGER);
    integer(value.r, "r", Number.MIN_SAFE_INTEGER);
  };
  if (shape.kind === "coordinates") {
    shape.coordinates.forEach(coordinate);
    if (
      new Set(shape.coordinates.map(coordinateKey)).size !==
      shape.coordinates.length
    )
      throw new Error("Hex shape contains duplicate coordinates.");
  } else if (shape.kind === "rectangle") {
    integer(shape.width, "width", 1);
    integer(shape.height, "height", 1);
    if (shape.start) coordinate(shape.start);
  } else {
    integer(shape.radius, "radius", 0);
    if (shape.center) coordinate(shape.center);
  }
  const Tile = hexClass(orientation);
  const traversal =
    shape.kind === "coordinates"
      ? coordinatesTraversal(...shape.coordinates)
      : shape.kind === "rectangle"
        ? rectangleTraversal(shape)
        : shape.kind === "ring"
          ? ringTraversal({
              radius: shape.radius,
              center: shape.center ?? { q: 0, r: 0 },
            })
          : spiralTraversal({ radius: shape.radius, start: shape.center });
  return new Grid(Tile, traversal).toArray().map(({ q, r }) => ({ q, r }));
}

export type HexTopologyEdge<BoardId extends string> = {
  id: HexEdgeId<BoardId>;
  spaceIds: string[];
  vertexIds: [HexVertexId<BoardId>, HexVertexId<BoardId>];
};
export type HexTopologyVertex<BoardId extends string> = {
  id: HexVertexId<BoardId>;
  spaceIds: string[];
  edgeIds: HexEdgeId<BoardId>[];
};

/** One immutable topology for materialization, rules, layout, and hit testing. */
export function createHexBoardGeometry<
  const BoardId extends string,
  SpaceId extends string,
>(board: {
  id: BoardId;
  orientation?: HexBoardOrientation;
  spaces: readonly HexBoardSpace<SpaceId>[];
}) {
  const spaces = board.spaces
    .map(({ id, q, r }) => ({ id, q, r }))
    .sort((a, b) => compare(a.id, b.id));
  const orientation = board.orientation ?? "pointy";
  const grid = new Grid(hexClass(orientation), spaces);
  const spacesById = new Map(spaces.map((space) => [space.id, space]));
  if (spacesById.size !== spaces.length || grid.size !== spaces.length)
    throw new Error(
      `Hex board '${board.id}' contains duplicate space IDs or coordinates.`,
    );
  const spacesByCoordinate = new Map(
    spaces.map((space) => [coordinateKey(space), space]),
  );
  const cornerOwners = new Map<
    string,
    { point: Point; owners: { id: SpaceId; corner: number }[] }
  >();
  const edgeOwners = new Map<
    string,
    { corners: [string, string]; owners: { id: SpaceId; side: number }[] }
  >();
  const cornersBySpace = new Map<SpaceId, string[]>();
  const edgesBySpace = new Map<SpaceId, string[]>();
  for (const space of spaces) {
    const corners = grid.getHex(space)!.corners;
    const cornerKeys = corners.map(pointKey);
    cornersBySpace.set(space.id, cornerKeys);
    const edgeKeys: string[] = [];
    corners.forEach((point, corner) => {
      const key = cornerKeys[corner]!;
      const vertex = cornerOwners.get(key) ?? { point, owners: [] };
      vertex.owners.push({ id: space.id, corner });
      cornerOwners.set(key, vertex);
      const pair = [key, cornerKeys[(corner + 1) % 6]!] as [string, string];
      const edgeKey = [...pair].sort(compare).join("|");
      const edge = edgeOwners.get(edgeKey) ?? { corners: pair, owners: [] };
      edge.owners.push({ id: space.id, side: corner });
      edgeOwners.set(edgeKey, edge);
      edgeKeys.push(edgeKey);
    });
    edgesBySpace.set(space.id, edgeKeys);
  }
  // Boundary IDs include an owner's corner/side to distinguish multiple boundary
  // elements incident to the same set of spaces. Interior IDs use all owners.
  const vertexIds = new Map(
    [...cornerOwners].map(([key, vertex]) => {
      const owners = [...vertex.owners].sort((a, b) => compare(a.id, b.id));
      return [
        key,
        `${board.id}:vertex:${owners.map((owner) => encodeURIComponent(owner.id)).join("|")}${owners.length < 3 ? `:${owners[0]!.corner}` : ""}` as HexVertexId<BoardId>,
      ];
    }),
  );
  const edgeIds = new Map(
    [...edgeOwners].map(([key, edge]) => {
      const owners = [...edge.owners].sort((a, b) => compare(a.id, b.id));
      return [
        key,
        `${board.id}:edge:${owners.map((owner) => encodeURIComponent(owner.id)).join("|")}${owners.length === 1 ? `:${owners[0]!.side}` : ""}` as HexEdgeId<BoardId>,
      ];
    }),
  );
  const edges: HexTopologyEdge<BoardId>[] = [...edgeOwners]
    .map(([key, edge]) => ({
      id: edgeIds.get(key)!,
      spaceIds: edge.owners.map((owner) => owner.id).sort(compare),
      vertexIds: edge.corners
        .map((key) => vertexIds.get(key)!)
        .sort(compare) as [HexVertexId<BoardId>, HexVertexId<BoardId>],
    }))
    .sort((a, b) => compare(a.id, b.id));
  const vertices: HexTopologyVertex<BoardId>[] = [...cornerOwners]
    .map(([key, vertex]) => ({
      id: vertexIds.get(key)!,
      spaceIds: vertex.owners.map((owner) => owner.id).sort(compare),
      edgeIds: edges
        .filter((edge) => edge.vertexIds.includes(vertexIds.get(key)!))
        .map((edge) => edge.id),
    }))
    .sort((a, b) => compare(a.id, b.id));
  const requireSpace = (id: SpaceId) => {
    const space = spacesById.get(id);
    if (!space)
      throw new Error(`Unknown space '${id}' on board '${board.id}'.`);
    return space;
  };
  const selectedIds = (coordinates: Iterable<AxialCoordinate>): SpaceId[] =>
    Array.from(coordinates).flatMap((coordinate) => {
      const space = spacesByCoordinate.get(coordinateKey(coordinate));
      return space ? [space.id] : [];
    });
  return {
    edges,
    vertices,
    neighbors(id: SpaceId) {
      requireSpace(id);
      return edges
        .filter((edge) => edge.spaceIds.includes(id))
        .flatMap((edge) =>
          edge.spaceIds.filter((other) => other !== id),
        ) as SpaceId[];
    },
    distance(from: SpaceId, to: SpaceId) {
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
      return edgesBySpace.get(id)!.map((key) => edgeIds.get(key)!);
    },
    verticesOf(id: SpaceId) {
      requireSpace(id);
      return cornersBySpace.get(id)!.map((key) => vertexIds.get(key)!);
    },
    edgeAt(id: SpaceId, side: 0 | 1 | 2 | 3 | 4 | 5) {
      requireSpace(id);
      const key = edgesBySpace.get(id)![side];
      if (!key)
        throw new Error("Hex side must be an integer from 0 through 5.");
      return edgeIds.get(key)!;
    },
    vertexAt(id: SpaceId, corner: 0 | 1 | 2 | 3 | 4 | 5) {
      requireSpace(id);
      const key = cornersBySpace.get(id)![corner];
      if (!key)
        throw new Error("Hex corner must be an integer from 0 through 5.");
      return vertexIds.get(key)!;
    },
    edge(a: SpaceId, b: SpaceId) {
      requireSpace(a);
      requireSpace(b);
      const edge = edges.find(
        (edge) =>
          edge.spaceIds.length === 2 &&
          edge.spaceIds.includes(a) &&
          edge.spaceIds.includes(b),
      );
      if (!edge || a === b)
        throw new Error(`Spaces '${a}' and '${b}' do not share an edge.`);
      return edge.id;
    },
    vertex(a: SpaceId, b: SpaceId, c: SpaceId) {
      requireSpace(a);
      requireSpace(b);
      requireSpace(c);
      const vertex = vertices.find(
        (vertex) =>
          vertex.spaceIds.length === 3 &&
          [a, b, c].every((id) => vertex.spaceIds.includes(id)),
      );
      if (!vertex || new Set([a, b, c]).size !== 3)
        throw new Error("Spaces do not share exactly one vertex.");
      return vertex.id;
    },
    incidentEdges(vertexId: HexVertexId<BoardId>) {
      const vertex = vertices.find((vertex) => vertex.id === vertexId);
      if (!vertex) throw new Error(`Unknown vertex '${vertexId}'.`);
      return vertex.edgeIds;
    },
    incidentVertices(edgeId: HexEdgeId<BoardId>) {
      const edge = edges.find((edge) => edge.id === edgeId);
      if (!edge) throw new Error(`Unknown edge '${edgeId}'.`);
      return edge.vertexIds;
    },
    spacesAt(vertexId: HexVertexId<BoardId>) {
      const vertex = vertices.find((vertex) => vertex.id === vertexId);
      if (!vertex) throw new Error(`Unknown vertex '${vertexId}'.`);
      return vertex.spaceIds as SpaceId[];
    },
    spacesAlong(edgeId: HexEdgeId<BoardId>) {
      const edge = edges.find((edge) => edge.id === edgeId);
      if (!edge) throw new Error(`Unknown edge '${edgeId}'.`);
      return edge.spaceIds as SpaceId[];
    },
    getLayout({
      hexSize,
      origin = { x: 0, y: 0 },
    }: {
      hexSize: number;
      origin?: Point;
    }) {
      if (!Number.isFinite(hexSize) || hexSize <= 0)
        throw new Error("hexSize must be positive and finite.");
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
      const vertexPoints = new Map(
        [...cornerOwners].map(([key, vertex]) => [
          vertexIds.get(key)!,
          {
            x: vertex.point.x * hexSize + origin.x,
            y: vertex.point.y * hexSize + origin.y,
          },
        ]),
      );
      return {
        viewBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        spaces: layoutSpaces,
        edges: edges.map((edge) => ({
          id: edge.id,
          from: vertexPoints.get(edge.vertexIds[0])!,
          to: vertexPoints.get(edge.vertexIds[1])!,
        })),
        vertices: vertices.map((vertex) => ({
          id: vertex.id,
          center: vertexPoints.get(vertex.id)!,
        })),
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
}

export function resolveHexSpaces(
  board: import("../../shared/domain/contracts.js").HexBoardSpec,
): import("../../shared/domain/contracts.js").HexSpaceSpec[] {
  const excluded = new Set((board.exclude ?? []).map(coordinateKey));
  const coordinates = hexShapeCoordinates(
    board.shape,
    board.orientation,
  ).filter((coordinate) => !excluded.has(coordinateKey(coordinate)));
  const known = new Set(coordinates.map(coordinateKey));
  for (const key of Object.keys(board.spaces ?? {})) {
    if (!known.has(key))
      throw new Error(
        `Hex board '${board.id}' overrides coordinate '${key}' outside its shape.`,
      );
  }
  return coordinates
    .map((coordinate) => {
      const key = coordinateKey(coordinate) as `${number},${number}`;
      return {
        ...coordinate,
        ...board.spaces?.[key],
        id: board.spaces?.[key]?.id ?? key,
      };
    })
    .sort((a, b) => compare(a.id, b.id));
}
