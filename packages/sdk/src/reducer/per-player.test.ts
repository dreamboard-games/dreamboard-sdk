import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  asPlayerId,
  boardRef,
  boardRefKey,
  boardRefSchema,
  isPerPlayer,
  isPerPlayerBoardRef,
  isPlayerId,
  isSharedBoardRef,
  parseBoardRefKey,
  perPlayer,
  perPlayerBoardRef,
  perPlayerEntries,
  perPlayerGet,
  perPlayerHas,
  perPlayerKeys,
  perPlayerMap,
  perPlayerRequire,
  perPlayerSchema,
  perPlayerSet,
  perPlayerSize,
  perPlayerValues,
  sharedBoardRef,
  type PerPlayer,
  type PlayerId,
} from "./per-player";

const seats = [
  asPlayerId("player-1"),
  asPlayerId("player-2"),
  asPlayerId("player-3"),
];

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

describe("perPlayer constructor", () => {
  test("creates ordered entries matching the seat list", () => {
    const scores = perPlayer(seats, (_, index) => index);
    expect(perPlayerSize(scores)).toBe(3);
    expect(perPlayerKeys(scores)).toEqual(["player-1", "player-2", "player-3"]);
    expect(perPlayerValues(scores)).toEqual([0, 1, 2]);
    expect(perPlayerEntries(scores)).toEqual([
      ["player-1", 0],
      ["player-2", 1],
      ["player-3", 2],
    ]);
  });

  test("rejects duplicate ids", () => {
    expect(() =>
      perPlayer([asPlayerId("player-1"), asPlayerId("player-1")], () => 0),
    ).toThrow(/duplicate player id/);
  });

  test("handles an empty seat list", () => {
    const empty = perPlayer([] as readonly PlayerId[], () => 0);
    expect(perPlayerSize(empty)).toBe(0);
    expect(perPlayerKeys(empty)).toEqual([]);
  });

  test("passes the seat index to init", () => {
    const indices: number[] = [];
    perPlayer(seats, (_id, index) => {
      indices.push(index);
      return 0;
    });
    expect(indices).toEqual([0, 1, 2]);
  });
});

describe("accessors", () => {
  const scores = perPlayer(seats, (_, index) => index * 10);

  test("perPlayerGet returns the value or undefined", () => {
    expect(perPlayerGet(scores, asPlayerId("player-2"))).toBe(10);
    expect(perPlayerGet(scores, asPlayerId("player-99"))).toBeUndefined();
  });

  test("perPlayerRequire throws for missing seats", () => {
    expect(perPlayerRequire(scores, asPlayerId("player-1"))).toBe(0);
    expect(() => perPlayerRequire(scores, asPlayerId("player-99"))).toThrow(
      /missing entry for player id 'player-99'/,
    );
  });

  test("perPlayerHas matches only present seats", () => {
    expect(perPlayerHas(scores, asPlayerId("player-1"))).toBe(true);
    expect(perPlayerHas(scores, asPlayerId("player-99"))).toBe(false);
  });
});

describe("perPlayerSet", () => {
  test("replaces an existing entry without reordering", () => {
    const scores = perPlayer(seats, () => 0);
    const next = perPlayerSet(scores, asPlayerId("player-2"), 42);
    expect(perPlayerKeys(next)).toEqual(["player-1", "player-2", "player-3"]);
    expect(perPlayerGet(next, asPlayerId("player-2"))).toBe(42);
    expect(perPlayerGet(scores, asPlayerId("player-2"))).toBe(0);
  });

  test("appends a new entry when the seat is not present", () => {
    const scores = perPlayer(seats, () => 0);
    const next = perPlayerSet(scores, asPlayerId("player-4"), 99);
    expect(perPlayerKeys(next)).toEqual([
      "player-1",
      "player-2",
      "player-3",
      "player-4",
    ]);
    expect(perPlayerGet(next, asPlayerId("player-4"))).toBe(99);
  });
});

describe("perPlayerMap", () => {
  test("produces a new PerPlayer with transformed values", () => {
    const scores = perPlayer(seats, (_, index) => index);
    const doubled = perPlayerMap(scores, (v) => v * 2);
    expect(perPlayerValues(doubled)).toEqual([0, 2, 4]);
    expect(perPlayerKeys(doubled)).toEqual(perPlayerKeys(scores));
  });
});

describe("isPerPlayer", () => {
  test("accepts a legitimate PerPlayer", () => {
    const pp = perPlayer(seats, () => 0);
    expect(isPerPlayer(pp)).toBe(true);
  });

  test("rejects plain records", () => {
    expect(isPerPlayer({ "player-1": 0 })).toBe(false);
    expect(isPerPlayer({ entries: [] })).toBe(false);
    expect(isPerPlayer({ __perPlayer: false, entries: [] })).toBe(false);
    expect(isPerPlayer(null)).toBe(false);
    expect(isPerPlayer(undefined)).toBe(false);
    expect(isPerPlayer([])).toBe(false);
  });
});

describe("perPlayerSchema", () => {
  const scoreSchema = z.number().int();

  test("parses the PerPlayer wire shape", () => {
    const schema = perPlayerSchema(scoreSchema);
    const wire: PerPlayer<number> = perPlayer(seats, (_, index) => index);
    const parsed = schema.parse(wire);
    expect(parsed).toEqual(wire);
  });

  test("rejects a plain Record<PlayerId, value> with a Zod error", () => {
    const schema = perPlayerSchema(scoreSchema);
    expect(() =>
      schema.parse({ "player-1": 0, "player-2": 1 } as unknown),
    ).toThrow(/__perPlayer|entries|Required|Invalid input/i);
  });

  test("rejects entries whose value fails the inner schema", () => {
    const schema = perPlayerSchema(scoreSchema);
    const bad = {
      __perPlayer: true,
      entries: [["player-1", "not a number"]],
    } as unknown;
    expect(() => schema.parse(bad)).toThrow();
  });

  test("players option enforces exact runtime seat list", () => {
    const schema = perPlayerSchema(scoreSchema, { players: seats });
    const good = perPlayer(seats, () => 0);
    expect(() => schema.parse(good)).not.toThrow();

    const missing: PerPlayer<number> = {
      __perPlayer: true,
      entries: [
        [asPlayerId("player-1"), 0],
        [asPlayerId("player-2"), 0],
      ],
    };
    expect(() => schema.parse(missing)).toThrow(
      /Missing entry for player id 'player-3'/,
    );

    const extra: PerPlayer<number> = {
      __perPlayer: true,
      entries: [
        [asPlayerId("player-1"), 0],
        [asPlayerId("player-2"), 0],
        [asPlayerId("player-3"), 0],
        [asPlayerId("player-4"), 0],
      ],
    };
    expect(() => schema.parse(extra)).toThrow(
      /Unexpected player id 'player-4'/,
    );
  });

  test("players option rejects duplicate seats", () => {
    const schema = perPlayerSchema(scoreSchema, { players: seats });
    const duplicate: PerPlayer<number> = {
      __perPlayer: true,
      entries: [
        [asPlayerId("player-1"), 0],
        [asPlayerId("player-1"), 0],
        [asPlayerId("player-2"), 0],
        [asPlayerId("player-3"), 0],
      ],
    };
    expect(() => schema.parse(duplicate)).toThrow(
      /Duplicate player id 'player-1'/,
    );
  });

  test("players option accepts entries in any order", () => {
    const schema = perPlayerSchema(scoreSchema, { players: seats });
    const shuffled: PerPlayer<number> = {
      __perPlayer: true,
      entries: [
        [asPlayerId("player-3"), 30],
        [asPlayerId("player-1"), 10],
        [asPlayerId("player-2"), 20],
      ],
    };
    expect(() => schema.parse(shuffled)).not.toThrow();
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
