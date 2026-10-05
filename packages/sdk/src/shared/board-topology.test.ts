import { describe, expect, it } from "vitest";
import {
  createBoardTopologyCache,
  deriveBoardTopology,
  rotateHex,
  rotateSquare,
  type TopologyTable,
} from "./board-topology.js";
import { TilePlacementSchema } from "./domain/tile-placement.js";
import type { TopologyDefinitions } from "./domain/topology-definitions.js";
import { tileSpaceId } from "./domain/tile-space.js";
import { MAXIMUM_BOARD_COORDINATE } from "./domain/board-coordinates.js";

function fixture(layout: "hex" | "square") {
  const definitions: TopologyDefinitions = {
    boardDefinitions: {
      board:
        layout === "hex"
          ? {
              id: "board",
              name: "Board",
              scope: "shared",
              layout,
              orientation: "pointy",
              fields: {},
            }
          : { id: "board", name: "Board", scope: "shared", layout, fields: {} },
    },
    tileDefinitions: {
      tile:
        layout === "hex"
          ? {
              id: "tile",
              name: "Tile",
              layout,
              fields: {},
              cells: [
                {
                  id: "cell",
                  at: { q: 0, r: 0 },
                  fields: { terrain: "plain" },
                },
              ],
              edges: [],
              vertices: [],
            }
          : {
              id: "tile",
              name: "Tile",
              layout,
              fields: {},
              cells: [
                {
                  id: "cell",
                  at: { col: 0, row: 0 },
                  fields: { terrain: "plain" },
                },
              ],
              edges: [],
              vertices: [],
            },
    },
  };
  const table: TopologyTable = {
    boards: { board: { baseId: "board", relations: [] } },
    tiles: {
      a: { id: "a", tileTypeId: "tile" },
      b: { id: "b", tileTypeId: "tile" },
    },
    componentLocations:
      layout === "hex"
        ? {
            a: {
              type: "OnBoard",
              layout,
              boardId: "board",
              q: -1,
              r: 0,
              rotation: 0,
            },
            b: {
              type: "OnBoard",
              layout,
              boardId: "board",
              q: 0,
              r: 0,
              rotation: 0,
            },
          }
        : {
            a: {
              type: "OnBoard",
              layout,
              boardId: "board",
              col: -1,
              row: 0,
              rotation: 0,
            },
            b: {
              type: "OnBoard",
              layout,
              boardId: "board",
              col: 0,
              row: 0,
              rotation: 0,
            },
          },
  };
  return { definitions, table };
}
describe("derived board topology", () => {
  it("rotates both lattices around the tile origin", () => {
    expect(
      Array.from({ length: 6 }, (_, rotation) => rotateHex(1, 0, rotation)),
    ).toEqual([
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: 1, r: -1 },
    ]);
    expect(
      Array.from({ length: 4 }, (_, rotation) => rotateSquare(1, 0, rotation)),
    ).toEqual([
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: -1, row: 0 },
      { col: 0, row: -1 },
    ]);
    expect(() =>
      rotateHex(MAXIMUM_BOARD_COORDINATE, MAXIMUM_BOARD_COORDINATE, 1),
    ).toThrow("coordinate");
  });
  for (const layout of ["hex", "square"] as const) {
    it(`${layout} merges negative-coordinate incidence and scopes IDs to runtime board`, () => {
      const { definitions, table } = fixture(layout),
        topology = deriveBoardTopology(table, definitions, "board");
      expect(topology.layout).toBe(layout);
      if (topology.layout === "generic")
        throw new Error("Expected tiled geometry");
      expect(
        topology.edges.filter((edge) => edge.spaceIds.length === 2),
      ).toHaveLength(1);
      expect(
        topology.vertices.filter((vertex) => vertex.spaceIds.length === 2),
      ).toHaveLength(2);
      expect(topology.spaces[tileSpaceId("a", "cell")].tileId).toBe("a");
      const other = deriveBoardTopology(
        {
          ...table,
          boards: { other: { baseId: "board", relations: [] } },
          componentLocations: Object.fromEntries(
            Object.entries(table.componentLocations).map(([id, location]) => [
              id,
              { ...location, boardId: "other" },
            ]),
          ),
        },
        definitions,
        "other",
      );
      if (other.layout === "generic")
        throw new Error("Expected tiled geometry");
      expect(
        other.edges.some((edge) =>
          topology.edges.some((original) => original.id === edge.id),
        ),
      ).toBe(false);
    });
    it(`${layout} rejects overlapping cells and translated coordinate overflow`, () => {
      const { definitions, table } = fixture(layout);
      expect(() =>
        deriveBoardTopology(
          {
            ...table,
            componentLocations: {
              a: table.componentLocations.a,
              b: table.componentLocations.a,
            },
          },
          definitions,
          "board",
        ),
      ).toThrow("Overlapping");
      const tile = definitions.tileDefinitions.tile;
      const overflow: TopologyDefinitions["tileDefinitions"][string] =
        layout === "hex"
          ? {
              id: tile.id,
              name: tile.name,
              fields: tile.fields,
              edges: [],
              vertices: [],
              layout,
              cells: [{ id: "cell", at: { q: 1, r: 0 }, fields: {} }],
            }
          : {
              id: tile.id,
              name: tile.name,
              fields: tile.fields,
              edges: [],
              vertices: [],
              layout,
              cells: [{ id: "cell", at: { col: 1, row: 0 }, fields: {} }],
            };
      const location =
        layout === "hex"
          ? {
              type: "OnBoard" as const,
              layout,
              boardId: "board",
              q: MAXIMUM_BOARD_COORDINATE,
              r: 0,
              rotation: 0 as const,
            }
          : {
              type: "OnBoard" as const,
              layout,
              boardId: "board",
              col: MAXIMUM_BOARD_COORDINATE,
              row: 0,
              rotation: 0 as const,
            };
      expect(() =>
        deriveBoardTopology(
          {
            ...table,
            tiles: { a: table.tiles.a },
            componentLocations: { a: location },
          },
          { ...definitions, tileDefinitions: { tile: overflow } },
          "board",
        ),
      ).toThrow("coordinate");
    });
  }
  it("merges equal shared-edge annotations and rejects conflicts between tiles", () => {
    const { definitions, table } = fixture("hex");
    const tile = definitions.tileDefinitions.tile;
    if (tile.layout !== "hex") throw new Error("Expected hex definition");
    const left = {
      ...tile,
      edges: [
        { cellId: "cell", side: 0 as const, fields: { road: { a: 1, b: 2 } } },
      ],
    };
    const right = {
      ...tile,
      edges: [
        { cellId: "cell", side: 3 as const, fields: { road: { b: 2, a: 1 } } },
      ],
    };
    const input = {
      ...table,
      tiles: { a: table.tiles.a, b: { ...table.tiles.b, tileTypeId: "right" } },
    };
    const defs = { ...definitions, tileDefinitions: { tile: left, right } };
    const topology = deriveBoardTopology(input, defs, "board");
    if (topology.layout !== "hex") throw new Error("Expected hex topology");
    expect(
      topology.edges.find((edge) => edge.spaceIds.length === 2)?.fields,
    ).toEqual({ road: { a: 1, b: 2 } });
    expect(() =>
      deriveBoardTopology(
        input,
        {
          ...defs,
          tileDefinitions: {
            tile: left,
            right: {
              ...right,
              edges: [
                { cellId: "cell", side: 3, fields: { road: { a: 9, b: 2 } } },
              ],
            },
          },
        },
        "board",
      ),
    ).toThrow("Conflicting field 'road'");
  });
  it("rejects shared-edge conflicts between cells of the same tile", () => {
    const { definitions, table } = fixture("hex");
    const tile = definitions.tileDefinitions.tile;
    if (tile.layout !== "hex") throw new Error("Expected hex definition");
    const defs = {
      ...definitions,
      tileDefinitions: {
        tile: {
          ...tile,
          cells: [
            { id: "west", at: { q: -1, r: 0 }, fields: {} },
            { id: "east", at: { q: 0, r: 0 }, fields: {} },
          ],
          edges: [
            { cellId: "west", side: 0 as const, typeId: "road", fields: {} },
            { cellId: "east", side: 3 as const, typeId: "river", fields: {} },
          ],
        },
      },
    };
    expect(() =>
      deriveBoardTopology(
        {
          ...table,
          tiles: { a: table.tiles.a },
          componentLocations: {
            a: {
              type: "OnBoard",
              layout: "hex",
              boardId: "board",
              q: 0,
              r: 0,
              rotation: 0,
            },
          },
        },
        defs,
        "board",
      ),
    ).toThrow("Conflicting typeId");
  });
  for (const layout of ["hex", "square"] as const) {
    it(`${layout} rotates multi-cell incidence and annotation ownership before translation`, () => {
      const { definitions, table } = fixture(layout);
      const hexOffsets = [
        [1, 0],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [0, -1],
        [1, -1],
      ];
      const squareOffsets = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ];
      const rotations = layout === "hex" ? 6 : 4;
      for (let rotation = 0; rotation < rotations; rotation++) {
        const tile = definitions.tileDefinitions.tile;
        if (tile.layout === "hex") {
          const definition = {
            ...tile,
            cells: [
              { id: "origin", at: { q: 0, r: 0 }, fields: {} },
              { id: "neighbor", at: { q: 1, r: 0 }, fields: {} },
            ],
            edges: [
              {
                cellId: "origin",
                side: 0 as const,
                label: "internal",
                fields: { road: true },
              },
            ],
            vertices: [
              {
                cellId: "origin",
                corner: 0 as const,
                fields: { marked: true },
              },
            ],
          };
          const placement = {
            type: "OnBoard" as const,
            layout: "hex" as const,
            boardId: "board",
            q: -3,
            r: 2,
            rotation,
          };
          const parsed = TilePlacementSchema.parse(placement);
          const topology = deriveBoardTopology(
            {
              ...table,
              tiles: { a: table.tiles.a },
              componentLocations: { a: parsed },
            },
            { ...definitions, tileDefinitions: { tile: definition } },
            "board",
          );
          if (topology.layout !== "hex")
            throw new Error("Expected hex topology");
          const offset = hexOffsets[rotation];
          expect(topology.spaces[tileSpaceId("a", "neighbor")]).toMatchObject({
            q: -3 + offset[0],
            r: 2 + offset[1],
          });
          expect(
            topology.edges.find((edge) => edge.label === "internal")?.spaceIds,
          ).toEqual([tileSpaceId("a", "neighbor"), tileSpaceId("a", "origin")]);
          expect(
            topology.vertices.find((vertex) => vertex.fields.marked === true)
              ?.spaceIds,
          ).toHaveLength(2);
        } else {
          const definition = {
            ...tile,
            cells: [
              { id: "origin", at: { col: 0, row: 0 }, fields: {} },
              { id: "neighbor", at: { col: 1, row: 0 }, fields: {} },
            ],
            edges: [
              {
                cellId: "origin",
                side: 0 as const,
                label: "internal",
                fields: { road: true },
              },
            ],
            vertices: [
              {
                cellId: "origin",
                corner: 0 as const,
                fields: { marked: true },
              },
            ],
          };
          const parsed = TilePlacementSchema.parse({
            type: "OnBoard",
            layout: "square",
            boardId: "board",
            col: -3,
            row: 2,
            rotation,
          });
          const topology = deriveBoardTopology(
            {
              ...table,
              tiles: { a: table.tiles.a },
              componentLocations: { a: parsed },
            },
            { ...definitions, tileDefinitions: { tile: definition } },
            "board",
          );
          if (topology.layout !== "square")
            throw new Error("Expected square topology");
          const offset = squareOffsets[rotation];
          expect(topology.spaces[tileSpaceId("a", "neighbor")]).toMatchObject({
            col: -3 + offset[0],
            row: 2 + offset[1],
          });
          expect(
            topology.edges.find((edge) => edge.label === "internal")?.spaceIds,
          ).toEqual([tileSpaceId("a", "neighbor"), tileSpaceId("a", "origin")]);
          expect(
            topology.vertices.find((vertex) => vertex.fields.marked === true)
              ?.spaceIds,
          ).toHaveLength(2);
        }
      }
    });
    it(`${layout} rejects shared vertex and square edge metadata conflicts`, () => {
      const { definitions, table } = fixture(layout);
      const tile = definitions.tileDefinitions.tile;
      if (tile.layout === "hex") {
        const left = {
            ...tile,
            vertices: [
              { cellId: "cell", corner: 0 as const, label: "town", fields: {} },
            ],
          },
          right = {
            ...tile,
            vertices: [
              {
                cellId: "cell",
                corner: 2 as const,
                label: "village",
                fields: {},
              },
            ],
          };
        expect(() =>
          deriveBoardTopology(
            {
              ...table,
              tiles: {
                a: table.tiles.a,
                b: { ...table.tiles.b, tileTypeId: "right" },
              },
            },
            { ...definitions, tileDefinitions: { tile: left, right } },
            "board",
          ),
        ).toThrow("Conflicting label");
      } else {
        const left = {
            ...tile,
            vertices: [
              { cellId: "cell", corner: 0 as const, label: "town", fields: {} },
            ],
          },
          right = {
            ...tile,
            vertices: [
              {
                cellId: "cell",
                corner: 1 as const,
                label: "village",
                fields: {},
              },
            ],
          };
        const input = {
          ...table,
          tiles: {
            a: table.tiles.a,
            b: { ...table.tiles.b, tileTypeId: "right" },
          },
        };
        expect(() =>
          deriveBoardTopology(
            input,
            { ...definitions, tileDefinitions: { tile: left, right } },
            "board",
          ),
        ).toThrow("Conflicting label");
        expect(() =>
          deriveBoardTopology(
            input,
            {
              ...definitions,
              tileDefinitions: {
                tile: {
                  ...tile,
                  edges: [
                    { cellId: "cell", side: 0, typeId: "road", fields: {} },
                  ],
                },
                right: {
                  ...tile,
                  edges: [
                    { cellId: "cell", side: 2, typeId: "river", fields: {} },
                  ],
                },
              },
            },
            "board",
          ),
        ).toThrow("Conflicting typeId");
      }
    });
  }
  it("shares cloned geometry while noticing metadata, placement and relation changes", () => {
    const { definitions, table } = fixture("hex"),
      cache = createBoardTopologyCache();
    const first = cache(table, definitions, "board");
    expect(
      cache(structuredClone(table), structuredClone(definitions), "board"),
    ).toBe(first);
    expect(Object.isFrozen(first.fields)).toBe(true);
    const metadata = {
      ...definitions,
      boardDefinitions: {
        board: {
          ...definitions.boardDefinitions.board,
          fields: { label: { color: "red" } },
        },
      },
    };
    const updated = cache(table, metadata, "board");
    expect(updated).not.toBe(first);
    expect(first.fields).toEqual({});
    expect(updated.fields).toEqual({ label: { color: "red" } });
    expect(Object.isFrozen(updated.fields.label)).toBe(true);
    const related = cache(
      {
        ...table,
        boards: {
          board: {
            baseId: "board",
            relations: [
              {
                id: "road",
                typeId: "road",
                fromSpaceId: tileSpaceId("a", "cell"),
                toSpaceId: tileSpaceId("b", "cell"),
                directed: false,
                fields: {},
              },
            ],
          },
        },
      },
      definitions,
      "board",
    );
    expect(related).not.toBe(first);
    expect(related.relations).toHaveLength(1);
    const changed = {
      ...table,
      componentLocations: {
        ...table.componentLocations,
        b: { type: "Detached" },
      },
    };
    expect(cache(changed, definitions, "board")).not.toBe(first);
    expect(() =>
      cache(
        {
          ...changed,
          boards: {
            board: {
              baseId: "board",
              relations: [
                {
                  id: "road",
                  typeId: "road",
                  fromSpaceId: tileSpaceId("a", "cell"),
                  toSpaceId: tileSpaceId("b", "cell"),
                  directed: false,
                  fields: {},
                },
              ],
            },
          },
        },
        definitions,
        "board",
      ),
    ).toThrow("absent space");
  });
});

it("bounds cache retention while retaining stable identity within its working set", () => {
  const { definitions } = fixture("hex"),
    cache = createBoardTopologyCache();
  const table: TopologyTable = {
    boards: { board: { baseId: "board", relations: [] } },
    tiles: {},
    componentLocations: {},
  };
  const first = cache(table, definitions, "board");
  for (let index = 0; index < 64; index++)
    cache(
      {
        ...table,
        boards: { [String(index)]: { baseId: "board", relations: [] } },
      },
      definitions,
      String(index),
    );
  expect(cache(table, definitions, "board")).not.toBe(first);
});

for (const layout of ["hex", "square"] as const)
  it(`${layout} cold and warm derivation agree across inventory insertion orders`, () => {
    const { table, definitions } = fixture(layout),
      reversed = {
        ...table,
        tiles: Object.fromEntries(Object.entries(table.tiles).reverse()),
      };
    const cache = createBoardTopologyCache(),
      first = cache(table, definitions, "board");
    expect(deriveBoardTopology(reversed, definitions, "board")).toEqual(
      deriveBoardTopology(table, definitions, "board"),
    );
    expect(cache(reversed, definitions, "board")).toBe(first);
  });
