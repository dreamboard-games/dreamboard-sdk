import { describe, expect, it } from "vitest";
import { compileManifest } from "./manifest/compiler.js";
import { createTestTransaction } from "./transaction-test-fixtures.js";
import { transactionMutations } from "./transaction-mutations.js";
import { createSeatDisclosure } from "./bundle/trusted/tile-disclosure.js";
import { perPlayerInstanceId } from "../shared/domain/per-player-instance.js";
import type { TileDisclosure } from "../shared/domain/tile-disclosure.js";

function fixture() {
  const definitions = compileManifest({
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    boards: [
      { id: "map", name: "Map", scope: "shared", layout: "hex" },
      {
        id: "private",
        name: "Private",
        scope: "perPlayer",
        layout: "hex",
        visibility: "ownerOnly",
      },
    ],
    tileTypes: [
      {
        id: "face",
        name: "Face",
        layout: "hex",
        cells: [{ id: "cell", at: { q: 0, r: 0 } }],
      },
    ],
    tileSeeds: [
      {
        id: "tile",
        typeId: "face",
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
  });
  const state = {
    table: definitions.createInitialTable({ playerIds: ["north", "south"] }),
  };
  const tx = createTestTransaction(state, definitions);
  return { state, tx, definitions };
}
const basis = { sessionId: "transaction-disclosure", version: 1 };
describe("transaction disclosure mutations", () => {
  it("reveals a private board explicitly and hides a public board without changing membership", () => {
    const { tx, definitions } = fixture();
    const ownBoard = perPlayerInstanceId("board", "private", "north");
    const beforeLocations = structuredClone(tx.state.table.componentLocations);
    const beforePrivate = tx.state.table.boards[ownBoard];
    expect(
      createSeatDisclosure(tx.state.table, definitions, "south", basis).boards[
        ownBoard
      ],
    ).toBeUndefined();
    tx.setBoardVisibility({ boardId: ownBoard, visibility: "public" });
    expect(
      createSeatDisclosure(tx.state.table, definitions, "south", basis).boards[
        ownBoard
      ],
    ).toBeDefined();
    tx.setBoardVisibility({ boardId: "map", visibility: "hidden" });
    expect(
      createSeatDisclosure(tx.state.table, definitions, "north", basis).boards
        .map,
    ).toBeUndefined();
    expect(tx.state.table.componentLocations).toEqual(beforeLocations);
    expect(tx.state.table.boards[ownBoard].relations).toEqual(
      beforePrivate.relations,
    );
  });
  it.each([
    { boardId: "missing", visibility: "public" },
    { boardId: "map", visibility: "ownerOnly" },
    { boardId: "map", visibility: "arbitrary" },
    { boardId: "__proto__", visibility: "public" },
  ])(
    "rejects an invalid board policy atomically: $boardId/$visibility",
    (args) => {
      const { state, definitions } = fixture();
      const before = structuredClone(state);
      expect(() =>
        transactionMutations.setBoardVisibility(state, args, definitions),
      ).toThrow();
      expect(state).toEqual(before);
    },
  );
  it("clones admitted instance disclosure and updates current seat access", () => {
    const { tx, definitions } = fixture();
    const disclosure: TileDisclosure = {
      face: { audience: "seats", playerIds: ["north"] },
      appearance: {
        layout: "hex",
        cells: [{ q: 0, r: 0 }],
        backImage: "assets/back.png",
      },
    };
    tx.setTileDisclosure({ tileId: "tile", disclosure });
    const own = createSeatDisclosure(
      tx.state.table,
      definitions,
      "north",
      basis,
    );
    const other = createSeatDisclosure(
      tx.state.table,
      definitions,
      "south",
      basis,
    );
    expect(own.tile("tile")?.disclosure).toBe("visible");
    expect(other.tile("tile")?.disclosure).toBe("concealed");
    if (disclosure.face.audience !== "seats") throw new Error("Expected seats");
    disclosure.face.playerIds.push("south");
    disclosure.appearance!.cells[0] = { q: 99, r: 99 };
    expect(tx.state.table.tiles.tile.disclosure).toEqual({
      face: { audience: "seats", playerIds: ["north"] },
      appearance: {
        layout: "hex",
        cells: [{ q: 0, r: 0 }],
        backImage: "assets/back.png",
      },
    });
    expect(definitions.tableSchema.safeParse(tx.state.table).success).toBe(
      true,
    );
  });
  it.each([
    { face: { audience: "seats", playerIds: ["outsider"] } },
    { face: { audience: "seats", playerIds: ["north", "north"] } },
    { face: { audience: "invalid" } },
    {
      face: { audience: "none" },
      appearance: { layout: "square", cells: [{ col: 0, row: 0 }] },
    },
    {
      face: { audience: "none" },
      appearance: {
        layout: "hex",
        cells: [
          { q: 0, r: 0 },
          { q: 0, r: 0 },
        ],
      },
    },
    {
      face: { audience: "none" },
      appearance: {
        layout: "hex",
        cells: [{ q: 0, r: 0 }],
        backImage: "https://secret.invalid/back.png",
      },
    },
  ])(
    "rejects malformed or incompatible disclosure before writing",
    (disclosure) => {
      const { state } = fixture();
      const before = structuredClone(state);
      expect(() =>
        transactionMutations.setTileDisclosure(state, {
          tileId: "tile",
          disclosure,
        }),
      ).toThrow();
      expect(state).toEqual(before);
    },
  );
  it("rejects unknown tiles without exposing or creating entries", () => {
    const { state } = fixture();
    const before = structuredClone(state);
    for (const tileId of ["missing", "__proto__"])
      expect(() =>
        transactionMutations.setTileDisclosure(state, {
          tileId,
          disclosure: { face: { audience: "public" } },
        }),
      ).toThrow();
    expect(state).toEqual(before);
  });
});
