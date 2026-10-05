import { describe, expect, it } from "vitest";
import * as z from "zod";
import { compileManifest } from "../manifest/compiler.js";
import { perPlayerInstanceId } from "../../shared/domain/per-player-instance.js";
import { tileSpaceId } from "../../shared/domain/tile-space.js";
import {
  addRelationInPlace,
  removeRelationInPlace,
} from "./relation-mutations.js";
import { BoardRelationSpecSchema } from "../../shared/domain/manifest-schema.js";
import { BoardRelationSchema } from "../../shared/board-topology-schema.js";
import { getBoard } from "./board-queries.js";
function fixture() {
  const definitions = compileManifest({
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    boards: [
      {
        id: "track",
        name: "Track",
        scope: "perPlayer",
        layout: "generic",
        spaces: [{ id: "a" }, { id: "b" }],
        relationFieldsSchema: z.strictObject({
          cost: z.int().min(0).default(2),
          required: z.string(),
        }),
      },
      { id: "map", name: "Map", scope: "shared", layout: "square" },
    ],
    tileTypes: [
      {
        id: "face",
        name: "Face",
        layout: "square",
        cells: [{ id: "cell", at: { col: 0, row: 0 } }],
      },
    ],
    tileSeeds: [
      {
        id: "tile",
        typeId: "face",
        home: {
          type: "board",
          boardId: "map",
          layout: "square",
          col: 0,
          row: 0,
          rotation: 0,
        },
      },
    ],
  });
  const table = definitions.createInitialTable({
    playerIds: ["north", "south"],
  });
  const boardId = perPlayerInstanceId("board", "track", "north");
  return { table, definitions, boardId };
}
const relation = {
  id: "road",
  typeId: "custom-open-tag",
  fromSpaceId: "a",
  toSpaceId: "b",
  fields: { required: "yes" },
};
describe("relation mutations", () => {
  it("requires an explicit nonempty identity at authored and wire boundaries", () => {
    const { id: _id, ...anonymous } = relation;
    for (const input of [
      anonymous,
      { ...relation, id: null },
      { ...relation, id: "" },
    ]) {
      expect(BoardRelationSpecSchema.safeParse(input).success).toBe(false);
      expect(
        BoardRelationSchema.safeParse({ ...input, directed: false }).success,
      ).toBe(false);
    }
  });
  it("adds normalized fields on the exact runtime board and refreshes cached topology", () => {
    const f = fixture();
    const before = getBoard(f.table, f.definitions, f.boardId);
    const other =
      f.table.boards[perPlayerInstanceId("board", "track", "south")];
    const input = structuredClone(relation);
    addRelationInPlace({ ...f, relation: input });
    input.fields.required = "changed";
    expect(getBoard(f.table, f.definitions, f.boardId)).not.toBe(before);
    expect(f.table.boards[f.boardId].relations).toEqual([
      { ...relation, directed: false, fields: { cost: 2, required: "yes" } },
    ]);
    expect(f.table.boards[perPlayerInstanceId("board", "track", "south")]).toBe(
      other,
    );
  });
  it.each([
    { ...relation, id: "" },
    { ...relation, typeId: "" },
    { ...relation, fromSpaceId: "missing" },
    { ...relation, fields: {} },
    { ...relation, fields: { required: "yes", cost: -1 } },
    { ...relation, fields: { required: "yes", extra: true } },
    { ...relation, directed: "yes" },
  ])("rejects invalid additions atomically", (invalid) => {
    const f = fixture();
    const before = structuredClone(f.table);
    const board = f.table.boards[f.boardId];
    expect(() => addRelationInPlace({ ...f, relation: invalid })).toThrow();
    expect(f.table).toEqual(before);
    expect(f.table.boards[f.boardId]).toBe(board);
  });
  it("rejects duplicate IDs and base IDs without changing existing relations", () => {
    const f = fixture();
    addRelationInPlace({ ...f, relation });
    const before = structuredClone(f.table);
    expect(() => addRelationInPlace({ ...f, relation })).toThrow(/Duplicate/);
    expect(() =>
      addRelationInPlace({ ...f, boardId: "track", relation }),
    ).toThrow();
    expect(f.table).toEqual(before);
  });
  it("uses current tiled membership and denies absent or cross-board endpoints", () => {
    const f = fixture();
    const cell = tileSpaceId("tile", "cell");
    addRelationInPlace({
      ...f,
      boardId: "map",
      relation: {
        id: "loop",
        typeId: "portal",
        fromSpaceId: cell,
        toSpaceId: cell,
      },
    });
    expect(f.table.boards.map.relations[0].fields).toEqual({});
    expect(() =>
      addRelationInPlace({
        ...f,
        relation: { ...relation, fromSpaceId: cell },
      }),
    ).toThrow(/endpoint/);
  });
  it("does not admit an endpoint after its tile has left the board", () => {
    const f = fixture();
    f.table.componentLocations.tile = { type: "Detached" };
    const before = structuredClone(f.table);
    expect(() =>
      addRelationInPlace({
        ...f,
        boardId: "map",
        relation: {
          id: "gone",
          typeId: "portal",
          fromSpaceId: tileSpaceId("tile", "cell"),
          toSpaceId: tileSpaceId("tile", "cell"),
        },
      }),
    ).toThrow(/endpoint/);
    expect(f.table).toEqual(before);
  });
  it("removes only the named relation on the exact board and rejects missing selectors atomically", () => {
    const f = fixture();
    addRelationInPlace({ ...f, relation });
    addRelationInPlace({ ...f, relation: { ...relation, id: "second" } });
    const before = structuredClone(f.table);
    expect(() =>
      removeRelationInPlace({ ...f, relationId: "missing" }),
    ).toThrow(/Unknown relation/);
    expect(() =>
      removeRelationInPlace({
        ...f,
        boardId: perPlayerInstanceId("board", "track", "south"),
        relationId: "road",
      }),
    ).toThrow(/Unknown relation/);
    expect(f.table).toEqual(before);
    removeRelationInPlace({ ...f, relationId: "road" });
    expect(
      f.table.boards[f.boardId].relations.map((value) => value.id),
    ).toEqual(["second"]);
  });
});
