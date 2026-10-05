import { describe, expect, it } from "vitest";
import { boardSpaceHostId, parseBoardSpaceHostId } from "./board-space-host.js";
import {
  perPlayerInstanceId,
  parsePerPlayerInstanceId,
} from "./per-player-instance.js";

describe("canonical board-space hosts", () => {
  it("round-trips literal and replicated boards with arbitrary separators", () => {
    for (const board of [
      "board:#/雪",
      perPlayerInstanceId("board", "board:#/雪", "seat:/🌊"),
    ]) {
      const id = boardSpaceHostId(board, 'cell:#/"雪');
      expect(parseBoardSpaceHostId(id)).toEqual({
        boardId: board,
        spaceId: 'cell:#/"雪',
      });
      expect(parsePerPlayerInstanceId(id)).toBeNull();
    }
  });
  it("rejects malformed and noncanonical syntax independently of membership", () => {
    for (const value of [
      null,
      "board:space",
      '@db/["board-space", "board","cell"]',
      '@db/["board-space","","cell"]',
      '@db/["board-space","board","cell","extra"]',
      perPlayerInstanceId("board", "board", "seat"),
    ])
      expect(parseBoardSpaceHostId(value)).toBeNull();
    expect(parseBoardSpaceHostId(boardSpaceHostId("absent", "absent"))).toEqual(
      { boardId: "absent", spaceId: "absent" },
    );
    expect(boardSpaceHostId("a:b", "c")).not.toBe(boardSpaceHostId("a", "b:c"));
  });
});
