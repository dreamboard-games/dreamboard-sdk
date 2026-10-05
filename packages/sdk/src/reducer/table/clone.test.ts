import { expect, test } from "vitest";
import { compileManifest } from "../manifest/compiler";
import type { RuntimeBoardInstance, RuntimeTableRecord } from "../model";
import { cloneRuntimeTable } from "./clone";

test("board clones preserve identity and isolate nested relation fields", () => {
  const table: RuntimeTableRecord = compileManifest({
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    zones: [],
  }).createInitialTable({ playerIds: ["player-1"] });
  const board = {
    baseId: "board",
    relations: [
      {
        typeId: "route",
        fromSpaceId: "origin",
        toSpaceId: "destination",
        directed: true,
        fields: { counters: { wood: 1 }, history: [1] },
      },
    ],
  } satisfies RuntimeBoardInstance;
  table.boards.board = board;
  const clone = cloneRuntimeTable(table);
  expect(clone.boards.board).toEqual(board);
  expect(clone.boards.board.relations[0].fields.history).not.toBe(
    board.relations[0].fields.history,
  );
  expect(clone.boards.board.relations[0].fields.counters).not.toBe(
    board.relations[0].fields.counters,
  );
  clone.boards.board.relations[0].fields.counters = { wood: 9 };
  expect(board.relations[0].fields.counters).toEqual({ wood: 1 });
});
