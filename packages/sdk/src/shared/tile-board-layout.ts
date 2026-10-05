import { immutableCopy } from "./immutable.js";
import { createHexTopology } from "./hex-board.js";
import { getPublicTileFootprint } from "./tile-appearance.js";
import {
  SeatBoardTopologySchema,
  type SeatBoardTopology,
} from "./seat-topology-schema.js";
import type { SeatSpaceRef, SeatTileRef } from "./domain/seat-reference.js";

export type TileLayoutPoint = { readonly x: number; readonly y: number };
type PlacedTile = Exclude<
  SeatBoardTopology,
  { layout: "generic" }
>["tiles"][number];
/** Rendering geometry is separate from inventory and spatial target handles. */
export type TileLayoutGeometry<Data extends PlacedTile = PlacedTile> = {
  readonly ref: SeatTileRef;
  readonly data: Data;
  readonly spaceIds: readonly SeatSpaceRef[];
  readonly outlines: readonly (readonly TileLayoutPoint[])[];
  readonly center: TileLayoutPoint;
  readonly anchor: TileLayoutPoint;
  readonly rotationDegrees: number;
};
type Corner = { readonly key: string; readonly point: TileLayoutPoint };
type Side = { readonly from: Corner; readonly to: Corner };
type Cell = {
  readonly center: TileLayoutPoint;
  readonly corners: readonly Corner[];
};
const frozenPoint = (point: TileLayoutPoint) => Object.freeze({ ...point });

/** Cancel internal sides using exact lattice identities, then walk every oriented boundary. */
function outlines(
  cells: readonly Cell[],
): readonly (readonly TileLayoutPoint[])[] {
  const sides = new Map<string, Side>();
  for (const cell of cells) {
    for (const [index, from] of cell.corners.entries()) {
      const to = cell.corners[(index + 1) % cell.corners.length];
      const key = [from.key, to.key].sort().join("|");
      if (sides.has(key)) sides.delete(key);
      else sides.set(key, { from, to });
    }
  }
  const outgoing = new Map<string, Side[]>();
  for (const side of sides.values()) {
    const next = outgoing.get(side.from.key) ?? [];
    next.push(side);
    outgoing.set(side.from.key, next);
  }
  const loops: (readonly TileLayoutPoint[])[] = [];
  while (sides.size) {
    const first = sides.values().next().value!;
    const start = first.from.key;
    let side = first;
    const loop: TileLayoutPoint[] = [];
    while (true) {
      loop.push(frozenPoint(side.from.point));
      sides.delete([side.from.key, side.to.key].sort().join("|"));
      const remaining = outgoing.get(side.from.key)!;
      remaining.splice(remaining.indexOf(side), 1);
      if (side.to.key === start) break;
      const candidates = [...(outgoing.get(side.to.key) ?? [])];
      if (!candidates.length)
        throw new Error("Tile footprint boundary is not closed.");
      // At corner-touching islands, preserve the clockwise contour instead of joining islands.
      const angle = Math.atan2(
        side.to.point.y - side.from.point.y,
        side.to.point.x - side.from.point.x,
      );
      const turn = (next: typeof side) => {
        const delta =
          Math.atan2(
            next.to.point.y - next.from.point.y,
            next.to.point.x - next.from.point.x,
          ) - angle;
        return Math.atan2(Math.sin(delta), Math.cos(delta));
      };
      candidates.sort(
        (a, b) =>
          turn(b) - turn(a) ||
          (a.to.key < b.to.key ? -1 : a.to.key > b.to.key ? 1 : 0),
      );
      side = candidates[0];
    }
    loops.push(Object.freeze(loop));
  }
  return Object.freeze(loops);
}

function hexCells(
  boardId: string,
  orientation: "pointy" | "flat",
  coordinates: readonly { q: number; r: number }[],
  size: number,
  origin: TileLayoutPoint,
): Cell[] {
  const topology = createHexTopology({
    id: boardId,
    orientation,
    spaces: coordinates.map((coordinate, index) => ({
      ...coordinate,
      id: String(index),
    })),
  });
  const layout = topology.getLayout({ hexSize: size, origin });
  const vertices = new Map(
    layout.vertices.map((vertex) => [vertex.id, vertex.center]),
  );
  return layout.spaces.map((space) => ({
    center: space.center,
    corners: topology
      .verticesOf(space.id)
      .map((key) => ({ key, point: vertices.get(key)! }))
      .sort(
        (a, b) =>
          Math.atan2(a.point.y - space.center.y, a.point.x - space.center.x) -
          Math.atan2(b.point.y - space.center.y, b.point.x - space.center.x),
      ),
  }));
}
function squareCells(
  coordinates: readonly { col: number; row: number }[],
  size: number,
  origin: TileLayoutPoint,
): Cell[] {
  return coordinates.map(({ col, row }) => ({
    center: {
      x: origin.x + (col + 0.5) * size,
      y: origin.y + (row + 0.5) * size,
    },
    corners: [
      [col, row],
      [col + 1, row],
      [col + 1, row + 1],
      [col, row + 1],
    ].map(([x, y]) => ({
      key: `${x},${y}`,
      point: { x: origin.x + x * size, y: origin.y + y * size },
    })),
  }));
}

function build(
  board: SeatBoardTopology,
  size: number,
  origin: TileLayoutPoint,
) {
  if (board.layout === "generic")
    throw new Error("Generic boards have no tile layout.");
  const visibleByTile = new Map<
    SeatTileRef,
    { cells: Cell[]; ids: SeatSpaceRef[] }
  >();
  const group = (
    spaces: readonly { tileRef: SeatTileRef; id: SeatSpaceRef }[],
    cells: readonly Cell[],
  ) => {
    spaces.forEach((space, index) => {
      const grouped = visibleByTile.get(space.tileRef) ?? {
        cells: [],
        ids: [],
      };
      grouped.cells.push(cells[index]);
      grouped.ids.push(space.id);
      visibleByTile.set(space.tileRef, grouped);
    });
  };
  if (board.layout === "hex") {
    const spaces = Object.values(board.spaces);
    group(spaces, hexCells(board.id, board.orientation, spaces, size, origin));
  } else {
    const spaces = Object.values(board.spaces);
    group(spaces, squareCells(spaces, size, origin));
  }
  const tiles = board.tiles.map((tile): TileLayoutGeometry => {
    const visible = visibleByTile.get(tile.ref);
    const footprint =
      tile.disclosure === "concealed"
        ? getPublicTileFootprint(tile.appearance, tile.placement)
        : null;
    let cells: Cell[];
    let anchor: TileLayoutPoint;
    if (board.layout === "hex" && tile.placement.layout === "hex") {
      const placement = tile.placement;
      cells =
        tile.disclosure === "visible"
          ? (visible?.cells ?? [])
          : footprint?.layout === "hex"
            ? hexCells(
                board.id,
                board.orientation,
                footprint.cells,
                size,
                origin,
              )
            : [];
      anchor = hexCells(
        board.id,
        board.orientation,
        [{ q: placement.q, r: placement.r }],
        size,
        origin,
      )[0].center;
    } else if (
      board.layout === "square" &&
      tile.placement.layout === "square"
    ) {
      const placement = tile.placement;
      cells =
        tile.disclosure === "visible"
          ? (visible?.cells ?? [])
          : footprint?.layout === "square"
            ? squareCells(footprint.cells, size, origin)
            : [];
      anchor = squareCells(
        [{ col: placement.col, row: placement.row }],
        size,
        origin,
      )[0].center;
    } else throw new Error("Tile placement layout does not match board.");
    if (!cells.length)
      throw new Error("A projected tile requires a nonempty footprint.");
    const center = {
      x: cells.reduce((sum, cell) => sum + cell.center.x, 0) / cells.length,
      y: cells.reduce((sum, cell) => sum + cell.center.y, 0) / cells.length,
    };
    return Object.freeze({
      ref: tile.ref,
      data: tile,
      spaceIds: Object.freeze(visible?.ids ?? []),
      outlines: outlines(cells),
      center: frozenPoint(center),
      anchor: frozenPoint(anchor),
      rotationDegrees:
        tile.placement.rotation * (board.layout === "hex" ? 60 : 90),
    });
  });
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const tile of tiles)
    for (const loop of tile.outlines)
      for (const point of loop) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
  return Object.freeze({
    tiles: Object.freeze(tiles),
    viewBox: Object.freeze({
      x: tiles.length ? minX : 0,
      y: tiles.length ? minY : 0,
      width: tiles.length ? maxX - minX : 0,
      height: tiles.length ? maxY - minY : 0,
    }),
  });
}
const cache = new WeakMap<
  SeatBoardTopology,
  { key: string; value: ReturnType<typeof build> }
>();
/** Admit projected topology and layout options before caching derived rendering geometry. */
export function createTileBoardLayout(
  board: SeatBoardTopology,
  size: number,
  suppliedOrigin: TileLayoutPoint = { x: 0, y: 0 },
) {
  if (!Number.isFinite(size) || size <= 0)
    throw new Error("Tile cell size must be positive and finite.");
  if (![suppliedOrigin.x, suppliedOrigin.y].every(Number.isFinite))
    throw new Error("Tile layout origin must be finite.");
  const key = JSON.stringify([size, suppliedOrigin.x, suppliedOrigin.y]);
  const cached = cache.get(board);
  if (cached?.key === key) return cached.value;
  const value = build(
    immutableCopy(SeatBoardTopologySchema.parse(board)),
    size,
    {
      ...suppliedOrigin,
    },
  );
  cache.set(board, { key, value });
  return value;
}
