import { describe, expect, test } from "vitest";
import { compileManifest } from "../reducer/manifest/compiler.js";
import { createSeatDisclosure } from "../reducer/bundle/trusted/tile-disclosure.js";
import { createTileBoardLayout } from "./tile-board-layout.js";
import { createHexTopology } from "./hex-board.js";
import type { SeatBoardTopology } from "./seat-topology-schema.js";
import { SeatBoardTopologySchema } from "./seat-topology-schema.js";
import { SeatTileRefSchema } from "./domain/seat-reference.js";

const ref = SeatTileRefSchema.parse(`tile-ref:sha256:${"a".repeat(64)}`);
function square(
  cells: readonly { col: number; row: number }[],
  rotation: 0 | 1 | 2 | 3 = 0,
) {
  return SeatBoardTopologySchema.parse({
    id: "map",
    baseId: "map",
    name: "Map",
    scope: "shared",
    layout: "square",
    fields: {},
    spaces: {},
    edges: [],
    vertices: [],
    relations: [],
    tiles: [
      {
        disclosure: "concealed",
        ref,
        appearance: { layout: "square", cells },
        placement: { layout: "square", col: 3, row: -2, rotation },
      },
    ],
  });
}
function hex(
  cells: readonly { q: number; r: number }[],
  rotation: 0 | 1 | 2 | 3 | 4 | 5 = 0,
  visible = true,
  orientation: "pointy" | "flat" = "pointy",
) {
  const manifest = compileManifest({
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "map",
        name: "Map",
        scope: "shared",
        layout: "hex",
        orientation,
      },
    ],
    tileTypes: [
      {
        id: "terrain",
        name: "Terrain",
        layout: "hex",
        cells: cells.map((at, index) => ({ id: String(index), at })),
      },
    ],
    tileSeeds: [
      {
        id: "tile",
        typeId: "terrain",
        disclosure: visible
          ? { face: { audience: "public" as const } }
          : {
              face: { audience: "none" as const },
              appearance: { layout: "hex" as const, cells },
            },
        home: {
          type: "board",
          boardId: "map",
          layout: "hex",
          q: 0,
          r: 0,
          rotation,
        },
      },
    ],
  });
  const table = manifest.createInitialTable({ playerIds: ["alice"] });
  return createSeatDisclosure(table, manifest, "alice", {
    sessionId: "test",
    version: 1,
  }).boards.map;
}
const area = (loop: readonly { x: number; y: number }[]) =>
  loop.reduce((sum, p, index) => {
    const next = loop[(index + 1) % loop.length];
    return sum + p.x * next.y - next.x * p.y;
  }, 0) / 2;

describe("projected tile geometry", () => {
  test("hex outlines coincide with lattice corners for every rotation", () => {
    for (const rotation of [0, 1, 2, 3, 4, 5] as const) {
      for (const visible of [true, false]) {
        const board = hex(
          [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
            { q: 0, r: 1 },
          ],
          rotation,
          visible,
        );
        const tile = createTileBoardLayout(board, 20).tiles[0];
        expect(tile.outlines).toHaveLength(1);
        expect(tile.outlines[0]).toHaveLength(12);
        expect(tile.rotationDegrees).toBe(rotation * 60);
        expect(tile.spaceIds).toHaveLength(visible ? 3 : 0);
        if (visible && board.layout === "hex") {
          const corners = createHexTopology({
            id: board.id,
            orientation: board.orientation,
            spaces: Object.values(board.spaces),
          })
            .getLayout({ hexSize: 20 })
            .spaces.flatMap((space) => space.corners);
          for (const point of tile.outlines[0])
            expect(
              corners.some(
                (corner) =>
                  Math.abs(corner.x - point.x) < 1e-10 &&
                  Math.abs(corner.y - point.y) < 1e-10,
              ),
            ).toBe(true);
        }
      }
    }
    expect(
      createTileBoardLayout(hex([{ q: 0, r: 0 }]), 10).tiles[0].outlines[0],
    ).toHaveLength(6);
    expect(
      createTileBoardLayout(
        hex([
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ]),
        10,
      ).tiles[0].outlines[0],
    ).toHaveLength(10);
  });
  test("square boundaries preserve holes, disconnected islands and corner touching", () => {
    const ring = Array.from({ length: 3 }, (_, col) =>
      Array.from({ length: 3 }, (_, row) => ({ col, row })),
    )
      .flat()
      .filter(({ col, row }) => col !== 1 || row !== 1);
    for (const rotation of [0, 1, 2, 3] as const) {
      const tile = createTileBoardLayout(square(ring, rotation), 10).tiles[0];
      expect(tile.outlines).toHaveLength(2);
      expect(
        tile.outlines.map((loop) => loop.length).sort((a, b) => a - b),
      ).toEqual([4, 12]);
      expect(tile.outlines.map(area).reduce((sum, a) => sum + a, 0)).toBe(800);
      expect(tile.rotationDegrees).toBe(rotation * 90);
    }
    expect(
      createTileBoardLayout(
        square([
          { col: 0, row: 0 },
          { col: 3, row: 0 },
        ]),
        10,
      ).tiles[0].outlines.map((loop) => loop.length),
    ).toEqual([4, 4]);
    expect(
      createTileBoardLayout(
        square([
          { col: 0, row: 0 },
          { col: 1, row: 1 },
        ]),
        10,
      ).tiles[0].outlines.map((loop) => loop.length),
    ).toEqual([4, 4]);
  });
  test("concealed footprint owns bounds and anchor without visible spatial targets", () => {
    const layout = createTileBoardLayout(
      square(
        [
          { col: 0, row: 0 },
          { col: 1, row: 0 },
        ],
        1,
      ),
      10,
      { x: 2, y: 4 },
    );
    expect(layout.viewBox).toEqual({ x: 32, y: -16, width: 10, height: 20 });
    expect(layout.tiles[0].anchor).toEqual({ x: 37, y: -11 });
    expect(layout.tiles[0].center).toEqual({ x: 37, y: -6 });
    expect(layout.tiles[0].spaceIds).toEqual([]);
  });
  test("admission precedes cache; immutable option snapshots and board identity control reuse", () => {
    const board = square([{ col: 0, row: 0 }]);
    const origin = { x: 1, y: 2 };
    const first = createTileBoardLayout(board, 10, origin);
    expect(createTileBoardLayout(board, 10, origin)).toBe(first);
    origin.x = 20;
    expect(first.viewBox.x).toBe(31);
    expect(createTileBoardLayout(board, 10, origin)).not.toBe(first);
    expect(
      createTileBoardLayout(
        square([
          { col: 0, row: 0 },
          { col: 1, row: 0 },
        ]),
        10,
      ).viewBox.width,
    ).toBe(20);
    expect(Object.isFrozen(first.tiles[0].outlines[0][0])).toBe(true);
    for (const size of [0, -1, Infinity, NaN])
      expect(() => createTileBoardLayout(board, size)).toThrow(
        "positive and finite",
      );
    const malformed: SeatBoardTopology = { ...board, id: "wrong" };
    expect(() => createTileBoardLayout(malformed, 10)).toThrow();
  });
});

test("flat hex footprints retain holes and separate disconnected islands", () => {
  const ring = [
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: -1, r: 0 },
    { q: 0, r: -1 },
    { q: 1, r: -1 },
  ];
  for (const visible of [true, false]) {
    const tile = createTileBoardLayout(hex(ring, 0, visible, "flat"), 17)
      .tiles[0];
    expect(
      tile.outlines.map((loop) => loop.length).sort((a, b) => a - b),
    ).toEqual([6, 18]);
    const islands = createTileBoardLayout(
      hex(
        [
          { q: 0, r: 0 },
          { q: 3, r: 0 },
        ],
        0,
        visible,
        "flat",
      ),
      17,
    ).tiles[0];
    expect(islands.outlines.map((loop) => loop.length)).toEqual([6, 6]);
  }
});
