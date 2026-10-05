import { describe, expect, it } from "vitest";
import { compileManifest } from "./compiler";
import {
  AuthoredTileDisclosureSchema,
  PublicTileAppearanceSchema,
  TileDisclosureSchema,
} from "../../shared/domain/tile-disclosure.js";

const source = {
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  boards: [{ id: "board", name: "Board", scope: "shared", layout: "hex" }],
  tileTypes: [
    {
      id: "type",
      name: "Type",
      layout: "hex",
      cells: [{ id: "origin", at: { q: 0, r: 0 } }],
    },
  ],
  tileSeeds: [
    {
      id: "tile",
      typeId: "type",
      home: {
        type: "board",
        boardId: "board",
        layout: "hex",
        q: 0,
        r: 0,
        rotation: 0,
      },
    },
  ],
} as const;
describe("tile disclosure models", () => {
  it("initializes explicit public policy and validates mutable face seats against the roster", () => {
    const compiled = compileManifest(source);
    const table = compiled.createInitialTable({
      playerIds: ["north", "south"],
    });
    expect(table.boards.board.visibility).toBe("public");
    expect(table.tiles.tile.disclosure).toEqual({
      face: { audience: "public" },
    });
    table.tiles.tile.disclosure = {
      face: { audience: "seats", playerIds: ["north"] },
    };
    expect(compiled.tableSchema.safeParse(table).success).toBe(true);
    table.tiles.tile.disclosure = {
      face: { audience: "seats", playerIds: ["outsider"] },
    };
    expect(compiled.tableSchema.safeParse(table).success).toBe(false);
  });
  it("authors private initial boards and independent instance disclosure without sharing mutable data", () => {
    const compiled = compileManifest({
      ...source,
      boards: [
        {
          id: "board",
          name: "Board",
          scope: "perPlayer",
          layout: "hex",
          visibility: "ownerOnly",
        },
      ],
      tileSeeds: [
        {
          ...source.tileSeeds[0],
          scope: "perPlayer",
          disclosure: {
            face: { audience: "owner" },
            appearance: {
              layout: "hex",
              cells: [{ q: 0, r: 0 }],
              backImage: "assets/back.png",
            },
          },
        },
      ],
    });
    const table = compiled.createInitialTable({
      playerIds: ["north", "south"],
    });
    expect(
      Object.values(table.boards).map((board) => board.visibility),
    ).toEqual(["ownerOnly", "ownerOnly"]);
    const [first, second] = Object.values(table.tiles);
    expect(first.disclosure.face).toEqual({ audience: "owner" });
    expect(first.disclosure.appearance).toEqual(second.disclosure.appearance);
    first.disclosure.face = { audience: "none" };
    expect(second.disclosure.face).toEqual({ audience: "owner" });
    expect(compiled.tableSchema.safeParse(table).success).toBe(true);
  });
  it("rejects a shared ownerOnly board and a misplaced footprint at restore", () => {
    const compiled = compileManifest(source);
    const table = compiled.createInitialTable({ playerIds: ["north"] });
    table.boards.board.visibility = "ownerOnly";
    expect(compiled.tableSchema.safeParse(table).success).toBe(false);
    table.boards.board.visibility = "public";
    table.tiles.tile.disclosure = {
      face: { audience: "public" },
      appearance: { layout: "square", cells: [{ col: 0, row: 0 }] },
    };
    expect(compiled.tableSchema.safeParse(table).success).toBe(false);
  });
  it("admits independent footprints without accepting hidden definition metadata", () => {
    expect(
      PublicTileAppearanceSchema.safeParse({
        layout: "hex",
        cells: [{ q: 0, r: 0 }],
        backImage: "assets/back.png",
      }).success,
    ).toBe(true);
    for (const cells of [
      [],
      [
        { q: 0, r: 0 },
        { q: 0, r: 0 },
      ],
      [{ q: Number.MAX_SAFE_INTEGER, r: 0 }],
    ])
      expect(
        PublicTileAppearanceSchema.safeParse({ layout: "hex", cells }).success,
      ).toBe(false);
    expect(
      PublicTileAppearanceSchema.safeParse({
        layout: "hex",
        cells: [{ id: "secret", q: 0, r: 0 }],
      }).success,
    ).toBe(false);
    expect(
      AuthoredTileDisclosureSchema.safeParse({
        face: { audience: "seats", playerIds: ["north"] },
      }).success,
    ).toBe(false);
    expect(
      TileDisclosureSchema.safeParse({
        face: { audience: "seats", playerIds: ["north", "north"] },
      }).success,
    ).toBe(false);
  });
});
