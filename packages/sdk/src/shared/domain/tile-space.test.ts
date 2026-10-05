import { describe, expect, it } from "vitest";
import { parseTileSpaceId, tileSpaceId } from "./tile-space.js";

describe("stable tile cell identity", () => {
  it("roundtrips arbitrary instance and local cell strings without delimiter collisions", () => {
    const tileId = '@db/["tile","tile:part","座席"]';
    const cellId = 'cell:one/"雪"';
    const id = tileSpaceId(tileId, cellId);
    expect(parseTileSpaceId(id)).toEqual({ tileId, cellId });
    expect(tileSpaceId("a:b", "c")).not.toBe(tileSpaceId("a", "b:c"));
  });
  it("rejects noncanonical syntax and other generated identity families", () => {
    for (const id of [
      null,
      "tile:cell",
      '@db/["tile-space", "tile","cell"]',
      '@db/["board-space","tile","cell"]',
      '@db/["tile-space","","cell"]',
    ])
      expect(parseTileSpaceId(id)).toBeNull();
    expect(() => tileSpaceId("tile", "")).toThrow();
  });
});
