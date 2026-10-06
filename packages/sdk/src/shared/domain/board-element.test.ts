import { describe, expect, it } from "vitest";
import {
  boardEdgeId,
  boardVertexId,
  parseBoardElementId,
} from "./board-element.js";
import { perPlayerInstanceId } from "./per-player-instance.js";

describe("world element identities", () => {
  it("scopes both layouts to exact runtime boards with arbitrary delimiters", () => {
    const board = perPlayerInstanceId(
      "board",
      "map:edge:0,0:e0",
      "席:vertex:1,1",
    );
    const edge = boardEdgeId("hex", board, "-2,1:e0");
    expect(parseBoardElementId(edge)).toEqual({
      kind: "edge",
      layout: "hex",
      boardId: board,
      latticeId: "-2,1:e0",
    });
    expect(
      boardEdgeId(
        "hex",
        perPlayerInstanceId("board", "map:edge:0,0:e0", "other"),
        "-2,1:e0",
      ),
    ).not.toBe(edge);
    expect(boardVertexId("square", board, "-2,1")).not.toBe(
      boardVertexId("hex", board, "-2,1:v0"),
    );
  });
  it("rejects noncanonical lattice coordinates, orientation and tuple syntax", () => {
    for (const key of [
      "01,0:e0",
      "-0,0:e0",
      "1e2,0:e0",
      "0,0:e3",
      "0,0:h",
      `${Number.MAX_SAFE_INTEGER + 1},0:e0`,
    ])
      expect(() => boardEdgeId("hex", "board", key)).toThrow("lattice");
    expect(() => boardVertexId("square", "board", "0,0:v0")).toThrow("lattice");
    expect(
      parseBoardElementId('@db/["board-edge", "hex","board","0,0:e0"]'),
    ).toBeNull();
    expect(
      parseBoardElementId('@db/["board-edge","hex","board","01,0:e0"]'),
    ).toBeNull();
  });
});
