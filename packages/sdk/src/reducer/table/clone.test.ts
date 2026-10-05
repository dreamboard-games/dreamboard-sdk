import { expect, test } from "vitest";
import { compileManifest } from "../manifest/compiler";
import type { RuntimeSquareBoardState, RuntimeTableRecord } from "../model";
import { cloneRuntimeTable } from "./clone";

test("board clones preserve square coordinates and isolate nested JSON fields", () => {
  const table: RuntimeTableRecord = compileManifest({
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    zones: [],
  }).createInitialTable({ playerIds: ["player-1"] });
  const board = {
    id: "board",
    layout: "square",
    scope: "shared",
    fields: { history: [1] },
    spaces: {
      origin: {
        id: "origin",
        row: 0,
        col: 0,
        fields: { counters: { wood: 1 } },
      },
    },
    relations: [],
    edges: [],
    vertices: [],
  } satisfies RuntimeSquareBoardState;
  table.boards.byId.board = board;
  table.boards.square.board = board;
  const clone = cloneRuntimeTable(table);
  expect(clone.boards.square.board).toEqual(board);
  expect(clone.boards.square.board.fields.history).not.toBe(
    board.fields.history,
  );
  expect(clone.boards.square.board.spaces.origin.fields.counters).not.toBe(
    board.spaces.origin.fields.counters,
  );
  clone.boards.square.board.spaces.origin.fields.counters = { wood: 9 };
  expect(board.spaces.origin.fields.counters).toEqual({ wood: 1 });
});
