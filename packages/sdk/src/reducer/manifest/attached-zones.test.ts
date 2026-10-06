import { describe, expect, it } from "vitest";
import * as z from "zod";
import { compileManifest } from "./compiler";
import { boardSpaceHostId } from "../../shared/domain/board-space-host.js";
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
      shape: { kind: "hexagon", radius: 0 },
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
    { id: "port", name: "Port", attachedTo: { board: "map", space: "0,0" } },
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
        boardSpaceHostId(perPlayerInstanceId("board", "map", "seat:/雪"), "0,0")
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
    const board = table.boards.byId[boardId];
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        boards: {
          ...table.boards,
          byId: {
            ...table.boards.byId,
            [boardId]: { ...board, containers: {} },
          },
        },
      }).success,
    ).toBe(false);
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        boards: {
          ...table.boards,
          byId: {
            ...table.boards.byId,
            [boardId]: {
              ...board,
              spaces: {
                ...board.spaces,
                "0,0": { ...board.spaces["0,0"], zoneId: "legacy" },
              },
            },
          },
        },
      }).success,
    ).toBe(false);
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
  it("rejects removed, rekeyed and mismatched declared static spaces", () => {
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
    const board = table.boards.byId.map;
    expect(compiled.tableSchema.safeParse(table).success).toBe(true);
    for (const spaces of [{}, { other: board.spaces.cell }]) {
      expect(
        compiled.tableSchema.safeParse({
          ...table,
          boards: { ...table.boards, byId: { map: { ...board, spaces } } },
          zones: { cargo: {} },
        }).success,
      ).toBe(false);
    }
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        boards: {
          ...table.boards,
          byId: {
            map: {
              ...board,
              spaces: { cell: { ...board.spaces.cell, id: "other" } },
            },
          },
        },
      }).success,
    ).toBe(false);
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
      }),
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
      }),
    ).toThrow(/cycle/i);
  });
  it("rejects undeclared attachment destinations and unavailable host bases", () => {
    expect(
      () =>
        void Reflect.apply(compileManifest, undefined, [
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
        void Reflect.apply(compileManifest, undefined, [
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
        void Reflect.apply(compileManifest, undefined, [
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
