import { expect, test } from "vitest";
import { PlayerRosterSchema, PlayerIdSchema } from "./player-identity.js";
import {
  perPlayerInstanceId,
  parsePerPlayerInstanceId,
} from "./per-player-instance.js";

test("live roster keys retain separators, Unicode and ordinary inherited names", () => {
  const ids = [
    "constructor",
    "toString",
    "table",
    '席/"north:one"',
    "@db/seat",
  ];
  expect(PlayerRosterSchema.parse(ids)).toEqual(ids);
});
test("invalid live roster values are rejected before record parsing", () => {
  for (const ids of [["__proto__"], [""], ["seat", "seat"], [42]])
    expect(PlayerRosterSchema.safeParse(ids).success).toBe(false);
  expect(PlayerIdSchema.safeParse("__proto__").success).toBe(false);
});
test("codec syntax remains independent of live roster admission", () => {
  const id = perPlayerInstanceId("board", "mat", "__proto__");
  expect(parsePerPlayerInstanceId(id)?.playerId).toBe("__proto__");
  expect(PlayerRosterSchema.safeParse(["__proto__"]).success).toBe(false);
});
