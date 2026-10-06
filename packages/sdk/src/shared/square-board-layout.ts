import type { SquareBoardTopology } from "./board-topology.js";
import { parseBoardElementId } from "./domain/board-element.js";

type Point = { readonly x: number; readonly y: number };

/** Render admitted square topology without inferring boundary incidence from cells. */
export function createSquareBoardLayout(
  board: SquareBoardTopology,
  size: number,
  origin: Point,
) {
  if (!Number.isFinite(size) || size <= 0)
    throw new Error("Square cell size must be positive and finite.");
  if (![origin.x, origin.y].every(Number.isFinite))
    throw new Error("Layout origin must be finite.");
  const spaces = Object.values(board.spaces).map((space) => {
    const x = origin.x + space.col * size;
    const y = origin.y + space.row * size;
    return {
      id: space.id,
      center: { x: x + size / 2, y: y + size / 2 },
      corners: [
        { x, y },
        { x: x + size, y },
        { x: x + size, y: y + size },
        { x, y: y + size },
      ],
    };
  });
  const vertices = board.vertices.map((vertex) => {
    const identity = parseBoardElementId(vertex.id);
    if (
      !identity ||
      identity.kind !== "vertex" ||
      identity.layout !== "square" ||
      identity.boardId !== board.id
    )
      throw new Error(
        `Square vertex '${vertex.id}' does not belong to board '${board.id}'.`,
      );
    const [col, row] = identity.latticeId.split(",").map(Number);
    return {
      id: vertex.id,
      center: { x: origin.x + col * size, y: origin.y + row * size },
    };
  });
  const vertexPoints = new Map(
    vertices.map((vertex) => [vertex.id, vertex.center]),
  );
  const edges = board.edges.map((edge) => {
    const from = vertexPoints.get(edge.vertexIds[0]);
    const to = vertexPoints.get(edge.vertexIds[1]);
    if (!from || !to)
      throw new Error(`Square edge '${edge.id}' references a missing vertex.`);
    return { id: edge.id, from, to };
  });
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const space of spaces) {
    for (const point of space.corners) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  const x = spaces.length ? minX : 0;
  const y = spaces.length ? minY : 0;
  return {
    viewBox: {
      x,
      y,
      width: spaces.length ? maxX - x : 0,
      height: spaces.length ? maxY - y : 0,
    },
    spaces,
    edges,
    vertices,
    pointToSpace(point: Point): string | undefined {
      const col = Math.floor((point.x - origin.x) / size);
      const row = Math.floor((point.y - origin.y) / size);
      return Object.values(board.spaces).find(
        (space) => space.col === col && space.row === row,
      )?.id;
    },
  };
}
