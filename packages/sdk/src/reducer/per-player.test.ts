import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  asPlayerId,
  boardRef,
  boardRefKey,
  boardRefSchema,
  isPerPlayerBoardRef,
  isPlayerId,
  isSharedBoardRef,
  parseBoardRefKey,
  perPlayerBoardRef,
  sharedBoardRef,
  type PlayerId,
} from "./per-player";

describe("PlayerId brand", () => {
  test("asPlayerId brands at the type level without changing the runtime value", () => {
    const branded: PlayerId = asPlayerId("player-1");
    expect(branded).toBe("player-1");
  });

  test("isPlayerId narrows non-empty strings", () => {
    expect(isPlayerId("player-1")).toBe(true);
    expect(isPlayerId("")).toBe(false);
    expect(isPlayerId(42)).toBe(false);
    expect(isPlayerId(null)).toBe(false);
    expect(isPlayerId(undefined)).toBe(false);
  });
});

describe("BoardRef", () => {
  test("sharedBoardRef creates a ref without a seat", () => {
    const ref = sharedBoardRef("market");
    expect(ref).toEqual({ baseId: "market" });
    expect(isSharedBoardRef(ref)).toBe(true);
    expect(isPerPlayerBoardRef(ref)).toBe(false);
  });

  test("perPlayerBoardRef creates a ref with a seat", () => {
    const ref = perPlayerBoardRef("ring", asPlayerId("player-2"));
    expect(ref).toEqual({ baseId: "ring", seat: "player-2" });
    expect(isSharedBoardRef(ref)).toBe(false);
    expect(isPerPlayerBoardRef(ref)).toBe(true);
  });

  test("boardRef universal constructor handles both shapes", () => {
    expect(boardRef("market")).toEqual({ baseId: "market" });
    expect(boardRef("ring", asPlayerId("player-2"))).toEqual({
      baseId: "ring",
      seat: "player-2",
    });
  });

  test("boardRefKey and parseBoardRefKey round-trip", () => {
    const shared = sharedBoardRef("market");
    const seated = perPlayerBoardRef("ring", asPlayerId("player-2"));
    expect(boardRefKey(shared)).toBe("market");
    expect(boardRefKey(seated)).toBe("ring:player-2");
    expect(parseBoardRefKey("market")).toEqual({ baseId: "market" });
    expect(parseBoardRefKey("ring:player-2")).toEqual({
      baseId: "ring",
      seat: "player-2",
    });
  });

  test("parseBoardRefKey rejects malformed keys", () => {
    expect(parseBoardRefKey("")).toBeNull();
    expect(parseBoardRefKey(":seat")).toBeNull();
    expect(parseBoardRefKey("base:")).toBeNull();
  });

  test("boardRefSchema parses both shared and per-player shapes", () => {
    const schema = boardRefSchema();
    expect(() => schema.parse({ baseId: "market" })).not.toThrow();
    expect(() =>
      schema.parse({ baseId: "ring", seat: "player-2" }),
    ).not.toThrow();
    expect(() => schema.parse({ baseId: "" })).toThrow();
  });

  test("boardRefSchema enforces manifest-scoped base and seat schemas", () => {
    const baseIdSchema = z.enum(["market", "ring"]);
    const playerIdSchema = z.enum([
      "player-1",
      "player-2",
    ]) as unknown as z.ZodType<PlayerId>;
    const schema = boardRefSchema({ baseIdSchema, playerIdSchema });
    expect(() =>
      schema.parse({ baseId: "ring", seat: "player-2" }),
    ).not.toThrow();
    expect(() =>
      schema.parse({ baseId: "unknown", seat: "player-1" }),
    ).toThrow();
    expect(() => schema.parse({ baseId: "ring", seat: "player-9" })).toThrow();
  });
});
