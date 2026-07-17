import { describe, expect, test } from "vitest";
import { perPlayerGet } from "../per-player";
import {
  addPlayerResourcesInPlace,
  canAffordResources,
  getMissingResources,
  getPlayerResourceAmount,
  getPlayerResourceTotal,
  setPlayerResourceInPlace,
  spendPlayerResourcesInPlace,
  transferPlayerResourcesInPlace,
} from "./index";
import { createSpatialTable } from "./table-test-fixtures";

const invalidAmounts = [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  -1,
  0.5,
  Number.MAX_SAFE_INTEGER + 1,
];

describe("resource mutation numeric contracts", () => {
  test("rejects invalid resource amounts before mutation", () => {
    for (const invalidAmount of invalidAmounts) {
      const table = createSpatialTable();
      const before = structuredClone(table.resources);

      expect(() =>
        addPlayerResourcesInPlace(table, "player-1", {
          coins: invalidAmount,
        }),
      ).toThrow("must be a non-negative safe integer");
      expect(() =>
        spendPlayerResourcesInPlace(table, "player-1", {
          coins: invalidAmount,
        }),
      ).toThrow("must be a non-negative safe integer");
      expect(() =>
        setPlayerResourceInPlace(table, "player-1", "coins", invalidAmount),
      ).toThrow("must be a non-negative safe integer");
      expect(() =>
        canAffordResources(table, "player-1", {
          coins: invalidAmount,
        }),
      ).toThrow("must be a non-negative safe integer");
      expect(() =>
        getMissingResources(table, "player-1", {
          coins: invalidAmount,
        }),
      ).toThrow("must be a non-negative safe integer");
      expect(table.resources).toEqual(before);
    }
  });

  test("zero amounts are no-ops and maximum safe balances are accepted", () => {
    const table = createSpatialTable();
    const before = structuredClone(table.resources);

    addPlayerResourcesInPlace(table, "player-1", { coins: 0 });
    spendPlayerResourcesInPlace(table, "player-1", { coins: 0 });
    expect(table.resources).toEqual(before);

    setPlayerResourceInPlace(
      table,
      "player-1",
      "coins",
      Number.MAX_SAFE_INTEGER,
    );
    expect(getPlayerResourceAmount(table, "player-1", "coins")).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  test("resource overflow is rejected before assignment", () => {
    const table = createSpatialTable();
    setPlayerResourceInPlace(
      table,
      "player-1",
      "coins",
      Number.MAX_SAFE_INTEGER,
    );
    const before = structuredClone(table.resources);

    expect(() =>
      addPlayerResourcesInPlace(table, "player-1", { coins: 1 }),
    ).toThrow("must be a non-negative safe integer");
    expect(table.resources).toEqual(before);
  });

  test("transfer overflow is rejected before either player changes", () => {
    const table = createSpatialTable();
    setPlayerResourceInPlace(table, "player-1", "coins", 2);
    setPlayerResourceInPlace(
      table,
      "player-2",
      "coins",
      Number.MAX_SAFE_INTEGER,
    );
    const before = structuredClone(table.resources);

    expect(() =>
      transferPlayerResourcesInPlace(table, "player-1", "player-2", {
        coins: 1,
      }),
    ).toThrow("must be a non-negative safe integer");
    expect(table.resources).toEqual(before);
  });

  test("stored malformed balances are rejected by resource reads", () => {
    const table = createSpatialTable();
    const playerResources = perPlayerGet(
      table.resources,
      "player-1" as never,
    ) as Record<string, unknown>;
    playerResources.coins = 0.5;

    expect(() => getPlayerResourceAmount(table, "player-1", "coins")).toThrow(
      "must be a non-negative safe integer",
    );
    expect(() => getPlayerResourceTotal(table, "player-1")).toThrow(
      "must be a non-negative safe integer",
    );
  });
});
