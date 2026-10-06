import { expect, test } from "vitest";
import {
  perPlayerInstanceId,
  parsePerPlayerInstanceId,
} from "./per-player-instance";

test("canonical identities round trip opaque authored and roster strings", () => {
  for (const baseId of [
    "base",
    "a:b",
    "@db/base",
    "a/b",
    'a"b',
    "棋盤",
    "🃏",
    "\uD800",
  ])
    for (const playerId of [
      "alice",
      "a:b",
      "@db/owner",
      "a/b",
      'a"b',
      "玩家",
      "🧑",
      "\uDFFF",
    ])
      for (const family of ["board", "card", "piece", "die"] as const) {
        const id = perPlayerInstanceId(family, baseId, playerId);
        expect(parsePerPlayerInstanceId(id)).toEqual({
          id,
          family,
          baseId,
          playerId,
        });
      }
});

test("families and tuple boundaries cannot collide", () => {
  const ids = [
    perPlayerInstanceId("board", "a:b", "c"),
    perPlayerInstanceId("board", "a", "b:c"),
    perPlayerInstanceId("card", "a:b", "c"),
    perPlayerInstanceId("piece", "a:b", "c"),
    perPlayerInstanceId("die", "a:b", "c"),
  ];
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every((id) => id !== "a:b:c")).toBe(true);
});

test("noncanonical, malformed, and empty identities cannot be decoded", () => {
  for (const value of [
    null,
    1,
    {},
    "shared-board",
    "@db/",
    '@db/v2/["board","a","b"]',
    '@db/["board", "a","b"]',
    '@db/["board","\\u0061","b"]',
    '@db/["board","a","b"]\n',
    '@db/["board","a","b",1]',
    '@db/["unknown","a","b"]',
    '@db/["board","","b"]',
    '@db/["board","a",""]',
    '@db/["board",1,"b"]',
  ])
    expect(parsePerPlayerInstanceId(value)).toBeNull();
  expect(() => perPlayerInstanceId("board", "", "alice")).toThrow();
  expect(() => perPlayerInstanceId("board", "base", "")).toThrow();
});

test("canonical syntax does not claim roster or table membership", () => {
  const forged = '@db/["board","absent","absent-player"]';
  expect(parsePerPlayerInstanceId(forged)).toEqual({
    id: forged,
    family: "board",
    baseId: "absent",
    playerId: "absent-player",
  });
});
