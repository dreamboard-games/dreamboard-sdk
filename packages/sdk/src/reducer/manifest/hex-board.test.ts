import { describe, expect, it } from "vitest";
import {
  createHexBoardGeometry,
  hexShapeCoordinates,
  hexagon,
  rectangle,
  ring,
  spiral,
  fromCoordinates,
  resolveHexSpaces,
} from "./hex-board";

describe("honeycomb board geometry", () => {
  for (const orientation of ["pointy", "flat"] as const) {
    it(`shares exact topology and round-trips centers (${orientation})`, () => {
      const spaces = hexShapeCoordinates(
        hexagon({ radius: 1 }),
        orientation,
      ).map((space) => ({ ...space, id: `${space.q},${space.r}` }));
      const board = createHexBoardGeometry({ id: "map", orientation, spaces });
      expect(board.edges).toHaveLength(30);
      expect(board.vertices).toHaveLength(24);
      expect(board.neighbors("0,0")).toHaveLength(6);
      expect(board.distance("0,0", "1,0")).toBe(1);
      expect(board.ring("0,0", 1)).toHaveLength(6);
      expect(board.line("-1,0", "1,0")).toEqual(["-1,0", "0,0", "1,0"]);
      expect(board.edge("0,0", "1,0")).toBe(board.edge("1,0", "0,0"));
      expect(board.vertex("0,0", "1,0", "1,-1")).toBe(
        board.vertex("1,-1", "0,0", "1,0"),
      );
      for (const edge of board.edges) {
        expect(edge.vertexIds).toHaveLength(2);
        for (const vertexId of edge.vertexIds)
          expect(
            board.vertices.find((vertex) => vertex.id === vertexId)?.edgeIds,
          ).toContain(edge.id);
      }
      for (const hexSize of [1, 17, 100]) {
        const layout = board.getLayout({ hexSize });
        for (const space of layout.spaces)
          expect(layout.pointToSpace(space.center)).toBe(space.id);
        expect(layout.pointToSpace({ x: 10000, y: 10000 })).toBeUndefined();
      }
      const reversed = createHexBoardGeometry({
        id: "map",
        orientation,
        spaces: [...spaces].reverse(),
      });
      expect(reversed.vertices).toEqual(board.vertices);
      expect(
        reversed.edges.map((edge) => ({
          ...edge,
          vertexIds: [...edge.vertexIds].sort(),
        })),
      ).toEqual(
        board.edges.map((edge) => ({
          ...edge,
          vertexIds: [...edge.vertexIds].sort(),
        })),
      );
    });
  }
  it("generates all supported shapes", () => {
    expect(hexShapeCoordinates(hexagon({ radius: 2 }))).toHaveLength(19);
    expect(hexShapeCoordinates(spiral({ radius: 2 }))).toHaveLength(19);
    expect(hexShapeCoordinates(ring({ radius: 2 }))).toHaveLength(12);
    expect(
      hexShapeCoordinates(rectangle({ width: 3, height: 2 })),
    ).toHaveLength(6);
    expect(hexShapeCoordinates(fromCoordinates([{ q: -10, r: 7 }]))).toEqual([
      { q: -10, r: 7 },
    ]);
  });
});

it("preserves boundary identity and exact incidence for one and two cells", () => {
  for (const coordinates of [
    [{ q: 0, r: 0 }],
    [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
  ]) {
    const board = createHexBoardGeometry({
      id: "boundary",
      spaces: coordinates.map((space, i) => ({ ...space, id: `space${i}` })),
    });
    expect(new Set(board.edges.map((edge) => edge.id)).size).toBe(
      coordinates.length === 1 ? 6 : 11,
    );
    expect(new Set(board.vertices.map((vertex) => vertex.id)).size).toBe(
      coordinates.length === 1 ? 6 : 10,
    );
    for (const edge of board.edges) {
      expect(new Set(board.incidentVertices(edge.id)).size).toBe(2);
      expect(board.incidentVertices(edge.id)).toEqual(
        board.vertices
          .filter((vertex) => vertex.edgeIds.includes(edge.id))
          .map((vertex) => vertex.id),
      );
    }
    if (coordinates.length === 2) {
      const shared = board.vertices.filter(
        (vertex) => vertex.spaceIds.length === 2,
      );
      expect(shared).toHaveLength(2);
      expect(shared[0]!.id).not.toBe(shared[1]!.id);
    }
  }
});

it("translates layout origin and excludes holes from hit testing", () => {
  const spaces = resolveHexSpaces({
    id: "hole",
    name: "Hole",
    layout: "hex",
    scope: "shared",
    shape: hexagon({ radius: 1 }),
    exclude: [{ q: 0, r: 0 }],
  });
  const board = createHexBoardGeometry({ id: "hole", spaces });
  const origin = { x: 120, y: -75 };
  const layout = board.getLayout({ hexSize: 40, origin });
  expect(layout.pointToSpace(origin)).toBeUndefined();
  for (const space of layout.spaces)
    expect(layout.pointToSpace(space.center)).toBe(space.id);
});

it("rejects malformed shapes and duplicate or excluded overrides", () => {
  expect(() => hexShapeCoordinates(hexagon({ radius: -1 }))).toThrow("radius");
  expect(() =>
    hexShapeCoordinates(rectangle({ width: 1.5, height: 2 })),
  ).toThrow("width");
  expect(() =>
    hexShapeCoordinates(
      fromCoordinates([
        { q: 0, r: 0 },
        { q: 0, r: 0 },
      ]),
    ),
  ).toThrow("duplicate");
  expect(() =>
    resolveHexSpaces({
      id: "map",
      name: "Map",
      scope: "shared",
      layout: "hex",
      shape: hexagon({ radius: 1 }),
      exclude: [{ q: 0, r: 0 }],
      spaces: { "0,0": { id: "center" } },
    }),
  ).toThrow("outside its shape");
  expect(() =>
    createHexBoardGeometry({
      id: "map",
      spaces: [
        { id: "same", q: 0, r: 0 },
        { id: "same", q: 1, r: 0 },
      ],
    }),
  ).toThrow("duplicate space IDs");
});

it("bound board queries validate generated space membership", async () => {
  const { compileManifest } = await import("./compiler");
  const { createTableQueries } = await import("../table-queries");
  const contract = compileManifest({
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "map",
        name: "Map",
        layout: "hex",
        scope: "shared",
        shape: hexagon({ radius: 0 }),
      },
    ],
  } as const);
  const board = createTableQueries(contract.createInitialTable()).board("map");
  expect(board.space("0,0").q).toBe(0);
  expect(() => board.space("5,5")).toThrow("Unknown space");
  expect(() => board.neighbors("5,5")).toThrow("Unknown space");
});
