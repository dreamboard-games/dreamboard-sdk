import { describe, expect, test } from "vitest";
import { asPlayerId, isPlayerId, type PlayerId } from "./per-player";

describe("PlayerId brand", () => {
  test("asPlayerId brands at the type level without changing the runtime value", () => {
    const branded: PlayerId = asPlayerId("player-1");
    expect(branded).toBe("player-1");
  });

  test("isPlayerId admits record-safe nonempty player keys", () => {
    expect(isPlayerId("player-1")).toBe(true);
    expect(isPlayerId("constructor")).toBe(true);
    expect(isPlayerId("__proto__")).toBe(false);
    expect(isPlayerId("")).toBe(false);
    expect(isPlayerId(42)).toBe(false);
    expect(isPlayerId(null)).toBe(false);
    expect(isPlayerId(undefined)).toBe(false);
  });
});
