import * as z from "zod";
import { describe, expect, it } from "vitest";
import { compileManifest } from "./compiler";
import { toManifestJson, ref } from "./field-schemas";
import { parseTopologyManifestJson } from "./parse-json";
import { perPlayerInstanceId } from "../../shared/domain/per-player-instance.js";

const source = {
  players: { minPlayers: 1, maxPlayers: 4 },
  cardSets: [],
  zones: [
    { id: "supply", name: "Supply", scope: "perPlayer", visibility: "public" },
  ],
  tileTypes: [
    {
      id: "island",
      name: "Island",
      layout: "hex",
      frontImage: "assets/tiles/island.svg",
      fieldsSchema: z.object({ terrain: z.string() }),
      fields: { terrain: "forest" },
      propertiesSchema: z.object({ charges: z.int().default(2) }),
      cellFieldsSchema: z.object({ elevation: z.int() }),
      edgeFieldsSchema: z.object({ cost: z.int() }),
      vertexFieldsSchema: z.object({ label: z.string() }),
      cells: [
        { id: "center", at: { q: 0, r: 0 }, fields: { elevation: 1 } },
        { id: "north", at: { q: 0, r: -1 }, fields: { elevation: 2 } },
      ],
      edges: [{ cellId: "center", side: 2, fields: { cost: 1 } }],
      vertices: [{ cellId: "north", corner: 5, fields: { label: "port" } }],
    },
    {
      id: "room",
      name: "Room",
      layout: "square",
      cells: [{ id: "room", at: { col: -1, row: 2 } }],
      edges: [{ cellId: "room", side: 3 }],
      vertices: [{ cellId: "room", corner: 0 }],
    },
  ],
  tileSeeds: [
    {
      id: "terrain",
      typeId: "island",
      count: 2,
      scope: "perPlayer",
      home: { type: "zone", zoneId: "supply" },
    },
    { id: "room", typeId: "room" },
  ],
} as const;

describe("manifest tile inventory", () => {
  it("expands actual roster inventory and keeps definitions outside instances", () => {
    const compiled = compileManifest(source);
    const table = compiled.createInitialTable({
      playerIds: ["north:/雪", "south"],
    });
    const id = perPlayerInstanceId("tile", "terrain-2", "north:/雪");
    expect(Object.keys(table.tiles)).toHaveLength(5);
    expect(table.tiles[id]).toEqual({
      componentType: "tile",
      disclosure: { face: { audience: "public" } },
      id,
      tileTypeId: "island",
      ownerId: "north:/雪",
      properties: { charges: 2 },
    });
    expect(table.componentLocations[id]).toEqual({
      type: "InZone",
      zoneId: "supply",
      hostId: "north:/雪",
      playedBy: null,
    });
    expect(
      table.zones.supply[compiled.ids.playerId.parse("north:/雪")],
    ).toEqual([perPlayerInstanceId("tile", "terrain-1", "north:/雪"), id]);
    expect(table.componentLocations.room).toEqual({ type: "Detached" });
    expect(compiled.literals.tileIds).toEqual(["room"]);
    expect(compiled.literals.tileTypeIds).toEqual(["island", "room"]);
    expect(
      Object.keys(compiled.records.tileIds(0, { playerIds: ["south"] })),
    ).toHaveLength(3);
    expect(compiled.tableSchema.safeParse(table).success).toBe(true);
  });
  it("rejects forged inventory, identity, owner, properties and spatial locations", () => {
    const compiled = compileManifest(source);
    const table = compiled.createInitialTable({ playerIds: ["seat"] });
    const id = perPlayerInstanceId("tile", "terrain-1", "seat");
    const tile = table.tiles[id];
    for (const changed of [
      { ...tile, id: "room" },
      { ...tile, tileTypeId: "room" },
      { ...tile, ownerId: "absent" },
      { ...tile, properties: { charges: "bad" } },
      { ...tile, cells: [] },
    ])
      expect(
        compiled.tableSchema.safeParse({
          ...table,
          tiles: { ...table.tiles, [id]: changed },
        }).success,
      ).toBe(false);
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        tiles: { ...table.tiles, extra: tile },
      }).success,
    ).toBe(false);
    const { [id]: removed, ...remaining } = table.tiles;
    void removed;
    expect(
      compiled.tableSchema.safeParse({ ...table, tiles: remaining }).success,
    ).toBe(false);
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        componentLocations: {
          ...table.componentLocations,
          [id]: { type: "OnSpace", boardId: "missing", spaceId: "missing" },
        },
      }).success,
    ).toBe(false);
  });
  it("rejects duplicate cells, coordinates and invalid cell annotation selectors", () => {
    const json = parseTopologyManifestJson(toManifestJson(source));
    for (const tileType of [
      {
        id: "bad",
        name: "Bad",
        layout: "hex",
        cells: [
          { id: "cell", at: { q: 0, r: 0 } },
          { id: "cell", at: { q: 0, r: 1 } },
        ],
      },
      {
        id: "bad",
        name: "Bad",
        layout: "square",
        cells: [
          { id: "one", at: { col: 0, row: 0 } },
          { id: "two", at: { col: 0, row: 0 } },
        ],
      },
      {
        id: "bad",
        name: "Bad",
        layout: "hex",
        cells: [{ id: "cell", at: { q: 0, r: 0 } }],
        edges: [{ cellId: "missing", side: 1 }],
      },
      {
        id: "bad",
        name: "Bad",
        layout: "square",
        cells: [{ id: "cell", at: { col: 0, row: 0 } }],
        vertices: [{ cellId: "cell", corner: 4 }],
      },
      {
        id: "bad",
        name: "Bad",
        layout: "hex",
        cells: [{ id: "cell", at: { q: Number.MAX_SAFE_INTEGER, r: 0 } }],
      },
      {
        id: "bad",
        name: "Bad",
        layout: "hex",
        cells: [{ id: "cell", typeId: "constructor", at: { q: 0, r: 0 } }],
      },
      {
        id: "bad",
        name: "Bad",
        layout: "square",
        cells: [{ id: "cell", at: { col: 0, row: 0 } }],
        edges: [{ cellId: "cell", side: 1, typeId: "__proto__" }],
      },
      {
        id: "bad",
        name: "Bad",
        layout: "hex",
        cells: [{ id: "cell", at: { q: 0, r: 0 } }],
        edges: [
          { cellId: "cell", side: 1 },
          { cellId: "cell", side: 1 },
        ],
      },
      {
        id: "bad",
        name: "Bad",
        layout: "square",
        cells: [{ id: "cell", at: { col: 0, row: 0 } }],
        vertices: [
          { cellId: "cell", corner: 2 },
          { cellId: "cell", corner: 2 },
        ],
      },
    ])
      expect(() =>
        parseTopologyManifestJson({
          ...json,
          tileTypes: [tileType],
          tileSeeds: [],
        }),
      ).toThrow();
  });
  it("rejects cross-family expanded collisions and invalid seed type IDs", () => {
    const json = parseTopologyManifestJson(toManifestJson(source));
    expect(() =>
      parseTopologyManifestJson({
        ...json,
        tileSeeds: [{ id: "piece", typeId: "room" }],
        pieceTypes: [{ id: "piece", name: "Piece" }],
        pieceSeeds: [{ id: "piece", typeId: "piece" }],
      }),
    ).toThrow(/Duplicate/);
    expect(() =>
      parseTopologyManifestJson({
        ...json,
        tileSeeds: [{ id: "room", typeId: "absent" }],
      }),
    ).toThrow(/Unknown component type/);
  });
  it("validates immutable and mutable fields through the portable schema owner", () => {
    const json = parseTopologyManifestJson(toManifestJson(source));
    const island = json.tileTypes?.[0];
    expect(() =>
      parseTopologyManifestJson({
        ...json,
        tileTypes: [{ ...island, fields: { terrain: 3 } }],
        tileSeeds: [],
      }),
    ).toThrow(/fields.terrain/);
    expect(() =>
      parseTopologyManifestJson({
        ...json,
        tileSeeds: [{ id: "room", typeId: "room", properties: {} }],
        tileTypes: [
          {
            id: "room",
            name: "Room",
            layout: "square",
            cells: [{ id: "cell", at: { col: 0, row: 0 } }],
            frontImage: "https://secret.example/image.svg",
          },
        ],
      }),
    ).toThrow(/frontImage/);
  });
  it("separates declared tile references from live roster admission", () => {
    const future = perPlayerInstanceId("tile", "terrain-1", "future");
    const compiled = compileManifest({
      ...source,
      tileTypes: [
        {
          ...source.tileTypes[0],
          fieldsSchema: z.object({ selected: ref.tileId() }),
          fields: { selected: future },
        },
        source.tileTypes[1],
      ],
    });
    expect(() =>
      compiled.createInitialTable({ playerIds: ["future"] }),
    ).not.toThrow();
    expect(() => compiled.createInitialTable({ playerIds: ["other"] })).toThrow(
      /reference|option/i,
    );
    const valid = compiled.createInitialTable({ playerIds: ["future"] });
    expect(
      compiled.tableSchema.safeParse({ ...valid, playerOrder: ["other"] })
        .success,
    ).toBe(false);
  });
});
