import { describe, expect, it } from "vitest";
import * as z from "zod";
import { compileManifest } from "./compiler";
import { tileSpaceId } from "../../shared/domain/tile-space.js";
import { perPlayerInstanceId } from "../../shared/domain/per-player-instance.js";

const manifest = {
  players: { minPlayers: 1, maxPlayers: 4 },
  cardSets: [],
  boards: [
    {
      id: "map",
      name: "Map",
      scope: "perPlayer",
      layout: "hex",
    },
  ],
  tileTypes: [
    {
      id: "terrain",
      name: "Terrain",
      layout: "hex",
      cells: [{ id: "center", at: { q: 0, r: 0 } }],
    },
  ],
  tileSeeds: [
    {
      id: "terrain",
      typeId: "terrain",
      scope: "perPlayer",
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
  pieceTypes: [
    { id: "ship", name: "Ship" },
    { id: "crate", name: "Crate" },
  ],
  pieceSeeds: [
    {
      id: "crate",
      typeId: "crate",
      scope: "perPlayer",
      home: { type: "zone", zoneId: "cargo", component: "ship-2" },
    },
    { id: "ship", typeId: "ship", count: 2, scope: "perPlayer" },
  ],
  zones: [
    {
      id: "cargo",
      name: "Cargo",
      attachedTo: { pieceType: "ship" },
      visibility: "ownerOnly",
    },
    {
      id: "port",
      name: "Port",
      attachedTo: { tileType: "terrain", cell: "center" },
    },
  ],
} as const;

describe("attached zone initialization", () => {
  it("enumerates actual hex/component hosts before resolving forward homes", () => {
    const compiled = compileManifest(manifest);
    const table = compiled.createInitialTable({
      playerIds: ["seat:/雪", "other"],
    });
    const ship = perPlayerInstanceId("piece", "ship-2", "seat:/雪");
    const crate = perPlayerInstanceId("piece", "crate", "seat:/雪");
    expect(table.zones.cargo[ship]).toEqual([crate]);
    expect(Object.keys(table.zones.cargo)).toHaveLength(4);
    expect(
      table.zones.port[
        tileSpaceId(
          perPlayerInstanceId("tile", "terrain", "seat:/雪"),
          "center",
        )
      ],
    ).toEqual([]);
    expect(table.componentLocations[crate]).toEqual({
      type: "InZone",
      zoneId: "cargo",
      hostId: ship,
      playedBy: null,
    });
  });
  it("rejects removed container and space-zone wire fields", () => {
    const compiled = compileManifest(manifest);
    const table = compiled.createInitialTable({ playerIds: ["seat"] });
    const boardId = perPlayerInstanceId("board", "map", "seat");
    const board = table.boards[boardId];
    for (const staleFields of [
      { containers: {} },
      { spaces: { "0,0": { id: "0,0", zoneId: "legacy" } } },
    ]) {
      expect(
        compiled.tableSchema.safeParse({
          ...table,
          boards: { ...table.boards, [boardId]: { ...board, ...staleFields } },
        }).success,
      ).toBe(false);
    }
    const pieceId = perPlayerInstanceId("piece", "crate", "seat");
    for (const legacyLocation of [
      {
        type: "InSlot",
        host: { kind: "piece", id: pieceId },
        slotId: "legacy",
      },
      { type: "InContainer", boardId, containerId: "legacy" },
    ])
      expect(
        compiled.tableSchema.safeParse({
          ...table,
          componentLocations: {
            ...table.componentLocations,
            [pieceId]: legacyLocation,
          },
        }).success,
      ).toBe(false);
  });
  it("keeps generic spaces immutable and rejects copied or missing hosts", () => {
    const compiled = compileManifest({
      players: manifest.players,
      cardSets: [],
      boards: [
        {
          id: "map",
          name: "Map",
          scope: "shared",
          layout: "generic",
          spaces: [{ id: "cell" }],
        },
      ],
      zones: [
        {
          id: "cargo",
          name: "Cargo",
          attachedTo: { board: "map", space: "cell" },
        },
      ],
    } as const);
    const table = compiled.createInitialTable({ playerIds: [] });
    const board = table.boards.map;
    const declaredSpace = compiled.boardDefinitions.map.spaces.cell;
    expect(compiled.tableSchema.safeParse(table).success).toBe(true);
    expect(Reflect.set(declaredSpace, "id", "other")).toBe(false);
    expect(
      compiled.tableSchema.safeParse({ ...table, zones: { cargo: {} } })
        .success,
    ).toBe(false);
    for (const spaces of [
      {},
      { other: declaredSpace },
      { cell: { ...declaredSpace, id: "other" } },
    ]) {
      expect(
        compiled.tableSchema.safeParse({
          ...table,
          boards: { map: { ...board, spaces } },
        }).success,
      ).toBe(false);
    }
    const empty = compileManifest({
      players: manifest.players,
      cardSets: [],
      boards: [
        { id: "empty", name: "Empty", scope: "shared", layout: "generic" },
      ],
    } as const);
    expect(
      empty.tableSchema.safeParse(empty.createInitialTable({ playerIds: [] }))
        .success,
    ).toBe(true);
  });
  it("rejects self and transitive initial containment cycles", () => {
    expect(() =>
      compileManifest({
        players: manifest.players,
        cardSets: [],
        pieceTypes: [{ id: "ship", name: "Ship" }],
        pieceSeeds: [
          {
            id: "a",
            typeId: "ship",
            home: { type: "zone", zoneId: "cargo", component: "a" },
          },
        ],
        zones: [manifest.zones[0]],
      }).createInitialTable({ playerIds: [] }),
    ).toThrow(/cycle|itself|self/i);
    expect(() =>
      compileManifest({
        players: manifest.players,
        cardSets: [],
        pieceTypes: [{ id: "ship", name: "Ship" }],
        pieceSeeds: [
          {
            id: "a",
            typeId: "ship",
            home: { type: "zone", zoneId: "cargo", component: "b" },
          },
          {
            id: "b",
            typeId: "ship",
            home: { type: "zone", zoneId: "cargo", component: "a" },
          },
        ],
        zones: [manifest.zones[0]],
      }).createInitialTable({ playerIds: [] }),
    ).toThrow(/cycle/i);
  });
  it("rejects undeclared attachment destinations and unavailable host bases", () => {
    expect(
      () =>
        void Reflect.apply(compileManifest<unknown>, undefined, [
          {
            ...manifest,
            zones: [
              { id: "bad", name: "Bad", attachedTo: { board: "missing" } },
            ],
          },
        ]),
    ).toThrow(/Unknown board/);
    expect(
      () =>
        void Reflect.apply(compileManifest<unknown>, undefined, [
          {
            ...manifest,
            pieceSeeds: [
              {
                id: "crate",
                typeId: "crate",
                home: { type: "zone", zoneId: "cargo", component: "missing" },
              },
            ],
          },
        ]),
    ).toThrow(/component/);
    expect(
      () =>
        void Reflect.apply(compileManifest<unknown>, undefined, [
          {
            players: manifest.players,
            cardSets: [
              {
                id: "cards",
                name: "Cards",
                cardSchema: z.object({}),
                defaultHome: { type: "detached" },
                cards: [],
              },
            ],
            boards: [
              {
                id: "shared",
                name: "Shared",
                scope: "shared",
                layout: "generic",
              },
            ],
            zones: [
              {
                id: "bad",
                name: "Bad",
                attachedTo: { board: "shared" },
                visibility: "ownerOnly",
              },
            ],
          },
        ]),
    ).toThrow(/ownerOnly/);
  });
});
