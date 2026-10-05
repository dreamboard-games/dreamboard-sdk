import * as hexTiles from "./hex-tiles";
import { tileSpaceId } from "../../shared/domain/tile-space.js";
import { parseBoardElementId } from "../../shared/domain/board-element.js";
import { describe, expect, it } from "vitest";
import { compileManifest } from "./compiler";
import { cloneRuntimeTable } from "../table/clone";
import { bindBoardQueries } from "../table/board-queries";
import {
  createHexTopology,
  createHexTopologyCache,
} from "../../shared/hex-board";

const identity = {
  boardId: "map",
  tileTypeId: "land",
  tileId: "land",
} as const;

describe("honeycomb board geometry", () => {
  for (const orientation of ["pointy", "flat"] as const) {
    it(`shares exact topology and round-trips centers (${orientation})`, () => {
      const spaces = hexTiles
        .hexagon({ ...identity, radius: 1 })
        .tileTypes[0].cells.map((cell) => cell.at)
        .map((space) => ({ ...space, id: `${space.q},${space.r}` }));
      const board = createHexTopology({ id: "map", orientation, spaces });
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
      const reversed = createHexTopology({
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
  it("generates ordinary tile inventory for all supported shapes", () => {
    expect(
      hexTiles.hexagon({ ...identity, radius: 2 }).tileTypes[0].cells,
    ).toHaveLength(19);
    expect(
      hexTiles.spiral({ ...identity, radius: 2 }).tileTypes[0].cells,
    ).toHaveLength(19);
    expect(
      hexTiles.ring({ ...identity, radius: 2 }).tileTypes[0].cells,
    ).toHaveLength(12);
    expect(
      hexTiles.rectangle({ ...identity, width: 3, height: 2 }).tileTypes[0]
        .cells,
    ).toHaveLength(6);
    expect(
      hexTiles.fromCoordinates({ ...identity, coordinates: [{ q: -10, r: 7 }] })
        .tileTypes[0].cells[0].at,
    ).toEqual({ q: -10, r: 7 });
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
    const board = createHexTopology({
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
      expect(shared[0].id).not.toBe(shared[1].id);
    }
  }
});

it("translates layout origin and excludes holes from hit testing", () => {
  const spaces = hexTiles
    .ring({ ...identity, radius: 1 })
    .tileTypes[0].cells.map((cell) => ({ id: cell.id, ...cell.at }));
  const board = createHexTopology({ id: "hole", spaces });
  const origin = { x: 120, y: -75 };
  const layout = board.getLayout({ hexSize: 40, origin });
  expect(layout.pointToSpace(origin)).toBeUndefined();
  for (const space of layout.spaces)
    expect(layout.pointToSpace(space.center)).toBe(space.id);
});

it("rejects malformed tile helper coordinates and duplicate runtime cell IDs", () => {
  expect(() => hexTiles.hexagon({ ...identity, radius: -1 })).toThrow();
  expect(() =>
    hexTiles.rectangle({ ...identity, width: 1.5, height: 2 }),
  ).toThrow();
  expect(() =>
    compileManifest({
      players: { minPlayers: 1, maxPlayers: 1 },
      cardSets: [],
      boards: [{ id: "map", name: "Map", layout: "hex", scope: "shared" }],
      ...hexTiles.fromCoordinates({
        ...identity,
        coordinates: [
          { q: 0, r: 0 },
          { q: 0, r: 0 },
        ],
      }),
    }),
  ).toThrow();
  expect(() =>
    createHexTopology({
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
    ...hexTiles.hexagon({ ...identity, radius: 0 }),
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "map",
        name: "Map",
        layout: "hex",
        scope: "shared",
      },
    ],
  } as const);
  const board = createTableQueries(
    contract.createInitialTable({ playerIds: [] }),
    contract,
  ).board("map");
  expect(board.space(tileSpaceId("land", "0,0")).q).toBe(0);
  expect(() => board.space(tileSpaceId("land", "5,5"))).toThrow(
    "Unknown space",
  );
  expect(() => board.neighbors(tileSpaceId("land", "5,5"))).toThrow(
    "Unknown space",
  );
});

it("keeps lattice identity as neighbours appear and uses axial sides in both orientations", () => {
  const directions = [
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: -1, r: 0 },
    { q: 0, r: -1 },
    { q: 1, r: -1 },
  ];
  for (const orientation of ["pointy", "flat"] as const) {
    const isolated = createHexTopology({
      id: "map",
      orientation,
      spaces: [{ id: "center", q: 0, r: 0 }],
    });
    const complete = createHexTopology({
      id: "map",
      orientation,
      spaces: [
        { id: "center", q: 0, r: 0 },
        ...directions.map((coordinate, index) => ({
          id: `neighbor${index}`,
          ...coordinate,
        })),
      ],
    });
    expect(complete.edgesOf("center")).toEqual(isolated.edgesOf("center"));
    expect(complete.verticesOf("center")).toEqual(
      isolated.verticesOf("center"),
    );
    for (const side of [0, 1, 2, 3, 4, 5] as const) {
      expect(complete.edgeAt("center", side)).toBe(
        complete.edge("center", `neighbor${side}`),
      );
      expect(complete.vertexAt("center", side)).toBe(
        complete.vertex(
          "center",
          `neighbor${side}`,
          `neighbor${(side + 1) % 6}`,
        ),
      );
    }
    for (const size of [1, 17, 100]) {
      const layout = complete.getLayout({
        hexSize: size,
        origin: { x: 11, y: -7 },
      });
      for (const space of layout.spaces) {
        for (const vertexId of complete.verticesOf(space.id)) {
          const point = layout.vertices.find(
            (vertex) => vertex.id === vertexId,
          )!.center;
          expect(
            space.corners.some(
              (corner) =>
                Math.hypot(corner.x - point.x, corner.y - point.y) <
                1e-9 * size,
            ),
          ).toBe(true);
        }
      }
    }
  }
});

it("distinguishes routes through present cells from lattice distance", () => {
  const topology = createHexTopology({
    id: "hole",
    spaces: [
      { id: "a", q: -1, r: 0 },
      { id: "b", q: 1, r: 0 },
      { id: "c", q: -1, r: 1 },
      { id: "d", q: 0, r: 1 },
      { id: "e", q: 1, r: 1 },
      { id: "isolated", q: 9, r: 9 },
    ],
  });
  expect(topology.gridDistance("a", "b")).toBe(2);
  expect(topology.distance("a", "b")).toBe(3);
  expect(topology.distance("a", "isolated")).toBe(Infinity);
  // @ts-expect-error Runtime callers still receive an error for unknown IDs.
  expect(() => topology.distance("missing", "missing")).toThrow(
    "Unknown space",
  );
});

it("reuses equal geometry without retaining metadata and invalidates mutated geometry", () => {
  const cached = createHexTopologyCache();
  const board = {
    id: "map",
    orientation: "pointy" as const,
    spaces: [{ id: "a", q: 0, r: 0, label: "old" }],
  };
  const first = cached(board);
  expect(cached(structuredClone(board))).toBe(first);
  board.spaces[0].label = "new";
  expect(cached(board)).toBe(first);
  expect(first.getLayout({ hexSize: 17 })).toBe(
    first.getLayout({ hexSize: 17 }),
  );
  board.spaces.push({ id: "b", q: 1, r: 0, label: "neighbor" });
  expect(cached(board)).not.toBe(first);
  expect(cached({ ...board, id: "another" })).not.toBe(first);
  expect(cached({ ...board, orientation: "flat" })).not.toBe(cached(board));
});

it("preserves pointy side pixel positions from the original honeycomb order", () => {
  const topology = createHexTopology({
    id: "map",
    spaces: [{ id: "a", q: 0, r: 0 }],
  });
  const layout = topology.getLayout({ hexSize: 31 });
  for (const side of [0, 1, 2, 3, 4, 5] as const) {
    const edge = layout.edges.find(
      (edge) => edge.id === topology.edgeAt("a", side),
    )!;
    for (const point of [edge.from, edge.to]) {
      expect(
        [
          layout.spaces[0].corners[side],
          layout.spaces[0].corners[(side + 1) % 6],
        ].some(
          (corner) => Math.hypot(point.x - corner.x, point.y - corner.y) < 1e-9,
        ),
      ).toBe(true);
    }
  }
});

it("reuses topology across cloned tables while retaining independent board state", () => {
  const manifest = compileManifest({
    ...hexTiles.fromCoordinates({
      ...identity,
      coordinates: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    }),
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "map",
        name: "Map",
        layout: "hex",
        scope: "shared",
      },
    ],
  } as const);
  const table = manifest.createInitialTable({ playerIds: [] });
  const first = bindBoardQueries(table, manifest, "map");
  const next = cloneRuntimeTable(table);
  const second = bindBoardQueries(next, manifest, "map");
  expect(second.edges).toBe(first.edges);
  expect(second.vertices).toBe(first.vertices);
  expect(second.state).toBe(first.state);
  expect(second.getLayout({ hexSize: 20 })).toBe(
    first.getLayout({ hexSize: 20 }),
  );
});

it("snapshots layout origin before caching hit testing", () => {
  const topology = createHexTopology({
    id: "map",
    spaces: [{ id: "a", q: 0, r: 0 }],
  });
  const origin = { x: 12, y: 34 };
  const layout = topology.getLayout({ hexSize: 20, origin });
  origin.x = 1000;
  origin.y = 1000;
  expect(layout.pointToSpace(layout.spaces[0].center)).toBe("a");
  expect(topology.getLayout({ hexSize: 20, origin: { x: 12, y: 34 } })).toBe(
    layout,
  );
});

it("shares incidence across several lattice radii and orientations", () => {
  for (const orientation of ["pointy", "flat"] as const) {
    for (const radius of [0, 1, 2, 4]) {
      const spaces = hexTiles
        .hexagon({ ...identity, radius })
        .tileTypes[0].cells.map((cell) => cell.at)
        .map((space) => ({ ...space, id: `${space.q},${space.r}` }));
      const topology = createHexTopology({
        id: "property",
        orientation,
        spaces,
      });
      for (const space of spaces) {
        expect(new Set(topology.edgesOf(space.id)).size).toBe(6);
        expect(new Set(topology.verticesOf(space.id)).size).toBe(6);
      }
      for (const edge of topology.edges) {
        expect(topology.spacesAlong(edge.id)).toEqual(edge.spaceIds);
        for (const id of edge.spaceIds)
          expect(topology.edgesOf(id)).toContain(edge.id);
        if (edge.spaceIds.length === 2)
          expect(topology.edge(edge.spaceIds[0], edge.spaceIds[1])).toBe(
            edge.id,
          );
      }
      for (const vertex of topology.vertices) {
        for (const id of vertex.spaceIds)
          expect(topology.verticesOf(id)).toContain(vertex.id);
        if (vertex.spaceIds.length === 3)
          expect(
            topology.vertex(
              vertex.spaceIds[0],
              vertex.spaceIds[1],
              vertex.spaceIds[2],
            ),
          ).toBe(vertex.id);
      }
    }
  }
});

it("snapshots board identity instead of retaining mutable input metadata", () => {
  const board = {
    id: "original",
    spaces: [{ id: "a", q: -3, r: -7, metadata: { secret: "private" } }],
  };
  const topology = createHexTopology(board);
  board.id = "changed";
  expect(() => topology.neighbors("missing")).toThrow("board 'original'");
  expect(parseBoardElementId(topology.edges[0].id)?.boardId).toBe("original");
});

it("rejects lattice coordinates whose adjacent cube coordinates overflow", () => {
  for (const space of [
    { q: Number.MAX_SAFE_INTEGER, r: 0 },
    { q: Number.MIN_SAFE_INTEGER, r: 0 },
    { q: 0, r: Number.MAX_SAFE_INTEGER },
    { q: Number.MAX_SAFE_INTEGER - 1, r: 1 },
  ])
    expect(() =>
      createHexTopology({ id: "overflow", spaces: [{ id: "a", ...space }] }),
    ).toThrow("safe one-step neighbours");
});

it("keeps cube distance exact across the supported coordinate bounds", () => {
  const limit = Math.floor(Number.MAX_SAFE_INTEGER / 4);
  const topology = createHexTopology({
    id: "bounds",
    spaces: [
      { id: "a", q: -limit, r: -limit },
      { id: "b", q: limit, r: limit },
    ],
  });
  expect(topology.gridDistance("a", "b")).toBe(4 * limit);
  expect(() =>
    createHexTopology({
      id: "bounds",
      spaces: [{ id: "a", q: limit + 1, r: 0 }],
    }),
  ).toThrow("exact cube arithmetic");
});
