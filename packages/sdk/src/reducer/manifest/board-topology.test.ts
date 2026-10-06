import {
  boardEdgeId,
  parseBoardElementId,
} from "../../shared/domain/board-element.js";
import * as z from "zod";
import { describe, it, expect } from "vitest";
import { ref } from "./field-schemas";
import { compileManifest } from "./compiler";
import { deriveBoardTopology } from "../../shared/board-topology.js";
import { tileSpaceId } from "../../shared/domain/tile-space.js";
import { perPlayerInstanceId } from "../../shared/domain/per-player-instance.js";
import { fromCoordinates, hexagon, ring, rectangle } from "./hex-tiles.js";
const source = {
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  boards: [
    {
      id: "map",
      name: "Map",
      scope: "shared",
      layout: "hex",
      boardFieldsSchema: z.object({ season: z.string().default("summer") }),
    },
  ],
  tileTypes: [
    {
      id: "terrain",
      name: "Terrain",
      layout: "hex",
      cells: [
        { id: "center", at: { q: 0, r: 0 }, fields: { terrain: "forest" } },
      ],
      cellFieldsSchema: z.object({ terrain: z.string() }),
    },
  ],
  tileSeeds: [
    {
      id: "tile",
      typeId: "terrain",
      home: {
        type: "board",
        boardId: "map",
        layout: "hex",
        q: 0,
        r: 0,
        rotation: 0,
      },
    },
  ],
} as const;
describe("definition-owned board topology", () => {
  it("stores only board identity and relations and freezes normalized definitions", () => {
    const compiled = compileManifest(source);
    const table = compiled.createInitialTable({ playerIds: ["seat"] });
    expect(table.boards).toEqual({
      map: { baseId: "map", visibility: "public", relations: [] },
    });
    expect(compiled.boardDefinitions.map.fields).toEqual({ season: "summer" });
    const topology = deriveBoardTopology(table, compiled, "map");
    expect(topology.spaces[tileSpaceId("tile", "center")].fields).toEqual({
      terrain: "forest",
    });
    expect(Object.isFrozen(compiled.tileDefinitions.terrain.cells[0].at)).toBe(
      true,
    );
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        boards: { map: { ...table.boards.map, spaces: {} } },
      }).success,
    ).toBe(false);
  });
  it("keeps actual roster spaces distinct for replicated boards and tiles", () => {
    const compiled = compileManifest({
      ...source,
      boards: [{ ...source.boards[0], scope: "perPlayer" }],
      tileSeeds: [{ ...source.tileSeeds[0], scope: "perPlayer" }],
    } as const);
    const table = compiled.createInitialTable({ playerIds: ["A", "B"] });
    const a = perPlayerInstanceId("board", "map", "A"),
      b = perPlayerInstanceId("board", "map", "B");
    const aSpace = tileSpaceId(
      perPlayerInstanceId("tile", "tile", "A"),
      "center",
    );
    const bSpace = tileSpaceId(
      perPlayerInstanceId("tile", "tile", "B"),
      "center",
    );
    expect(Object.keys(deriveBoardTopology(table, compiled, a).spaces)).toEqual(
      [aSpace],
    );
    expect(Object.keys(deriveBoardTopology(table, compiled, b).spaces)).toEqual(
      [bSpace],
    );
  });
  it("rejects mismatched layouts and generic-board placements", () => {
    const compiled = compileManifest(source),
      table = compiled.createInitialTable({ playerIds: ["seat"] });
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        componentLocations: {
          tile: {
            type: "OnBoard",
            layout: "square",
            boardId: "map",
            col: 0,
            row: 0,
            rotation: 0,
          },
        },
      }).success,
    ).toBe(false);
  });
  it("validates field references against current placements instead of seeded geometry", () => {
    const compiled = compileManifest({
      ...source,
      tileTypes: [
        {
          ...source.tileTypes[0],
          propertiesSchema: z.object({
            edge: ref.edgeId().optional(),
            space: ref.spaceId().optional(),
          }),
        },
      ],
    } as const);
    const table = compiled.createInitialTable({ playerIds: ["seat"] });
    const geometry = deriveBoardTopology(table, compiled, "map");
    if (geometry.layout !== "hex") throw new Error("Expected hex topology.");
    const withRefs = {
      ...table,
      tiles: {
        tile: {
          ...table.tiles.tile,
          properties: {
            edge: geometry.edges[0].id,
            space: tileSpaceId("tile", "center"),
          },
        },
      },
    };
    expect(compiled.tableSchema.safeParse(withRefs).success).toBe(true);
    const moved = {
      ...withRefs,
      componentLocations: {
        tile: {
          type: "OnBoard",
          layout: "hex",
          boardId: "map",
          q: 4,
          r: 0,
          rotation: 0,
        },
      },
    };
    expect(compiled.tableSchema.safeParse(moved).success).toBe(false);
    const noStaleEdge = {
      ...moved,
      tiles: {
        tile: {
          ...moved.tiles.tile,
          properties: { space: tileSpaceId("tile", "center") },
        },
      },
    };
    expect(compiled.tableSchema.safeParse(noStaleEdge).success).toBe(true);
  });
  it("rejects immutable board references made stale by tile relocation", () => {
    const initial = compileManifest(source);
    const initialTable = initial.createInitialTable({ playerIds: ["seat"] });
    const topology = deriveBoardTopology(initialTable, initial, "map");
    if (topology.layout !== "hex") throw new Error("Expected hex topology.");
    const edge = parseBoardElementId(topology.edges[0].id);
    if (!edge) throw new Error("Expected canonical edge identity.");
    const compiled = compileManifest({
      ...source,
      boards: [
        {
          ...source.boards[0],
          boardFieldsSchema: z.object({ edge: ref.edgeId() }),
          fields: { edge: boardEdgeId("hex", "map", edge.latticeId) },
        },
      ],
    } as const);
    const table = compiled.createInitialTable({ playerIds: ["seat"] });
    expect(compiled.tableSchema.safeParse(table).success).toBe(true);
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        componentLocations: {
          tile: {
            ...table.componentLocations.tile,
            type: "OnBoard",
            layout: "hex",
            boardId: "map",
            q: 4,
            r: 0,
            rotation: 0,
          },
        },
      }).success,
    ).toBe(false);
  });
  it("accepts future relation tags while rejecting absent endpoints and foreign-seat field refs", () => {
    const compiled = compileManifest({
      ...source,
      boards: [
        {
          ...source.boards[0],
          scope: "perPlayer",
          relationFieldsSchema: z.object({ selected: ref.spaceId() }),
        },
      ],
      tileSeeds: [{ ...source.tileSeeds[0], scope: "perPlayer" }],
    } as const);
    const table = compiled.createInitialTable({ playerIds: ["A", "B"] });
    const a = perPlayerInstanceId("board", "map", "A"),
      b = perPlayerInstanceId("board", "map", "B");
    const aSpace = tileSpaceId(
        perPlayerInstanceId("tile", "tile", "A"),
        "center",
      ),
      bSpace = tileSpaceId(perPlayerInstanceId("tile", "tile", "B"), "center");
    const relation = {
      typeId: "new-session-tag",
      fromSpaceId: bSpace,
      toSpaceId: bSpace,
      directed: false,
      fields: { selected: bSpace },
    };
    const valid = {
      ...table,
      boards: {
        ...table.boards,
        [b]: { ...table.boards[b], relations: [relation] },
      },
    };
    expect(compiled.tableSchema.safeParse(valid).success).toBe(true);
    expect(
      compiled.tableSchema.safeParse({
        ...valid,
        boards: {
          ...valid.boards,
          [b]: {
            ...table.boards[b],
            relations: [{ ...relation, fields: { selected: aSpace } }],
          },
        },
      }).success,
    ).toBe(false);
    expect(
      compiled.tableSchema.safeParse({
        ...valid,
        boards: {
          ...valid.boards,
          [b]: {
            ...table.boards[b],
            relations: [{ ...relation, toSpaceId: "missing" }],
          },
        },
      }).success,
    ).toBe(false);
    expect(Object.keys(table.boards)).toEqual([a, b]);
  });
  it("rejects duplicate relation identities when admitting restored state", () => {
    const compiled = compileManifest(source);
    const table = compiled.createInitialTable({ playerIds: ["seat"] });
    const relation = {
      typeId: "route",
      fromSpaceId: tileSpaceId("tile", "center"),
      toSpaceId: tileSpaceId("tile", "center"),
      directed: false,
      fields: {},
    };
    const restored = (relations: (typeof relation & { id?: string })[]) => ({
      ...table,
      boards: { map: { baseId: "map", visibility: "public", relations } },
    });
    const duplicate = restored([
      { ...relation, id: "link" },
      { ...relation, id: "link" },
    ]);
    expect(compiled.tableSchema.safeParse(duplicate).success).toBe(false);
    expect(() => deriveBoardTopology(duplicate, compiled, "map")).toThrow(
      "Duplicate relation identity 'link'",
    );
    expect(
      compiled.tableSchema.safeParse(
        restored([
          { ...relation, id: "first" },
          { ...relation, id: "second" },
        ]),
      ).success,
    ).toBe(true);
    expect(
      compiled.tableSchema.safeParse(restored([relation, relation])).success,
    ).toBe(true);
  });
  it("emits ordinary fixed-board seeds with matching explicit topology", () => {
    const fragment = fromCoordinates({
      boardId: "map",
      tileTypeId: "fixed",
      tileId: "fixed-tile",
      coordinates: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    } as const);
    const compiled = compileManifest({
      players: { minPlayers: 1, maxPlayers: 1 },
      cardSets: [],
      boards: [{ id: "map", name: "Map", scope: "shared", layout: "hex" }],
      ...fragment,
    } as const);
    const table = compiled.createInitialTable({ playerIds: [] });
    expect(
      Object.keys(deriveBoardTopology(table, compiled, "map").spaces),
    ).toEqual([
      tileSpaceId("fixed-tile", "0,0"),
      tileSpaceId("fixed-tile", "1,0"),
    ]);
    for (const radius of [NaN, Infinity, -1, 0.5])
      expect(() =>
        hexagon({ boardId: "map", tileTypeId: "t", tileId: "i", radius }),
      ).toThrow();
    expect(() =>
      ring({
        boardId: "map",
        tileTypeId: "t",
        tileId: "i",
        radius: 1,
        center: { q: Infinity, r: 0 },
      }),
    ).toThrow();
    expect(() =>
      rectangle({
        boardId: "map",
        tileTypeId: "t",
        tileId: "i",
        width: 1.5,
        height: 2,
      }),
    ).toThrow();
  });
});
