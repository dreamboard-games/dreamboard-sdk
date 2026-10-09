import { createTableQueries } from "../table-queries";
import type { RuntimeTableRecord } from "../model";
import { asPlayerId } from "../per-player";
import * as z from "zod";
import { describe, expect, test } from "vitest";
import { compileManifest } from "../manifest/compiler";
import { createTestTransaction } from "../transaction-test-fixtures";
import {
  flipCardInPlace,
  moveComponentToPositionInPlace,
  moveComponentToZoneInPlace,
  dealComponentsInPlace,
  rotateZoneInPlace,
} from "./card-mutations";
import { assertZoneConsistency } from "./zones";

const manifest = compileManifest({
  players: { minPlayers: 2, maxPlayers: 2 },
  cardSets: [
    {
      id: "main",
      name: "Main",
      cardSchema: z.object({}),
      defaultHome: { type: "zone", zoneId: "draw" },
      cards: [
        {
          id: "card",
          name: "Card",
          cardType: "main",
          count: 3,
          properties: {},
        },
      ],
    },
    {
      id: "special",
      name: "Special",
      cardSchema: z.object({}),
      defaultHome: { type: "zone", zoneId: "special" },
      cards: [
        {
          id: "special-card",
          name: "Special card",
          cardType: "special",
          count: 1,
          properties: {},
        },
      ],
    },
  ],
  zones: [
    { id: "draw", name: "Draw", scope: "shared", allowedCardSetIds: ["main"] },
    {
      id: "special",
      name: "Special",
      scope: "shared",
      allowedCardSetIds: ["special"],
    },
    {
      id: "mixed",
      name: "Mixed",
      scope: "shared",
      allowedCardSetIds: ["main", "special"],
    },
    {
      id: "discard",
      name: "Discard",
      scope: "shared",
      allowedCardSetIds: ["main"],
    },
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      visibility: "ownerOnly",
      allowedCardSetIds: ["main"],
    },
    {
      id: "public",
      name: "Public",
      scope: "perPlayer",
      allowedCardSetIds: ["main"],
    },
  ],
  boards: [],
  pieceTypes: [{ id: "token", name: "Token" }],
  pieceSeeds: [
    { id: "piece", typeId: "token", home: { type: "zone", zoneId: "discard" } },
  ],
  dieTypes: [{ id: "die", name: "Die", sides: 6 }],
  dieSeeds: [
    { id: "die", typeId: "die", home: { type: "zone", zoneId: "discard" } },
  ],
});
const createTable = () =>
  manifest.createInitialTable({ playerIds: ["alice", "bob"] });
const move = (
  table: ReturnType<typeof createTable>,
  componentId: string,
  to: { zoneId: string; hostId?: string },
  position?: "top" | "bottom" | number,
) =>
  moveComponentToZoneInPlace({
    table,
    definitions: manifest,
    componentId,
    to,
    position,
  });

function consistent(table: ReturnType<typeof createTable>) {
  assertZoneConsistency(table, manifest);
  expect(manifest.tableSchema.safeParse(table).success).toBe(true);
}

describe("canonical zone mutations", () => {
  test("treats an own piece named toString as a piece, not an inherited card", () => {
    const table = createTable();
    table.zones.discard.table = ["die"];
    Reflect.deleteProperty(table.pieces, "piece");
    Reflect.deleteProperty(table.componentLocations, "piece");
    Object.assign(table.pieces, {
      toString: { id: "toString", pieceTypeId: "token", properties: {} },
    });
    Object.assign(table.componentLocations, { toString: { type: "Detached" } });
    move(table, "toString", { zoneId: "draw" });
    expect(table.zones.draw.table).toEqual([
      "card-1",
      "card-2",
      "card-3",
      "toString",
    ]);
    expect(Object.hasOwn(table.visibility, "toString")).toBe(false);
    const q = createTableQueries<RuntimeTableRecord, typeof manifest>(
      table,
      manifest,
    );
    expect(q.component.data("toString")).toEqual({
      id: "toString",
      pieceTypeId: "token",
      properties: {},
    });
    expect(q.zone.cards("draw").cardIds).toEqual([
      "card-1",
      "card-2",
      "card-3",
    ]);
    expect(table.componentLocations.toString).toEqual({
      type: "InZone",
      zoneId: "draw",
      hostId: "table",
      playedBy: null,
    });
  });

  test("rejects invalid runtime rotation options before modifying memberships", () => {
    const table = createTable();
    const before = structuredClone(table);
    expect(() =>
      rotateZoneInPlace({
        table,
        definitions: manifest,
        zoneId: "hand",
        direction: "left",
        componentIdsByPlayer: { missing: [] },
      }),
    ).toThrow("selected player");
    expect(() => {
      rotateZoneInPlace({
        table,
        definitions: manifest,
        zoneId: "hand",
        // @ts-expect-error Explicit runtime-invalid direction.
        direction: "up",
      });
    }).toThrow("direction");
    expect(() => {
      rotateZoneInPlace({
        table,
        definitions: manifest,
        zoneId: "hand",
        direction: "left",
        // @ts-expect-error Explicit runtime-invalid insertion option.
        position: "middle",
      });
    }).toThrow("position");
    expect(table).toEqual(before);
  });

  test("restricts flip to cards in zones until other locations support concealed projection", () => {
    const table = createTable();
    table.zones.draw.table.shift();
    table.componentLocations["card-1"] = { type: "Detached" };
    const before = structuredClone(table);
    expect(() => flipCardInPlace(table, "card-1", false)).toThrow(
      "Only cards in zones",
    );
    expect(table).toEqual(before);
  });

  test("move defaults to bottom, supports top and numeric reordering without duplicate order state", () => {
    const table = createTable();
    move(table, "card-2", { zoneId: "draw" }, "top");
    expect(table.zones.draw.table).toEqual(["card-2", "card-1", "card-3"]);
    move(table, "card-2", { zoneId: "draw" }, 2);
    expect(table.zones.draw.table).toEqual(["card-1", "card-3", "card-2"]);
    move(table, "card-1", { zoneId: "discard" });
    expect(table.zones.draw.table).toEqual(["card-3", "card-2"]);
    expect(table.zones.discard.table).toEqual(["piece", "die", "card-1"]);
    expect(table.componentLocations["card-1"]).toEqual({
      type: "InZone",
      zoneId: "discard",
      hostId: "table",
      playedBy: null,
    });
    consistent(table);
  });

  test.each([false, true])(
    "same-zone moves preserve faceUp=%s through both movement APIs",
    (faceUp) => {
      const table = createTable();
      flipCardInPlace(table, "card-1", faceUp);
      move(table, "card-1", { zoneId: "draw" }, 2);
      expect(table.zones.draw.table).toEqual(["card-2", "card-3", "card-1"]);
      expect(table.visibility["card-1"].faceUp).toBe(faceUp);
      moveComponentToPositionInPlace({
        table,
        definitions: manifest,
        componentId: "card-1",
        at: { zoneId: "draw", hostId: "table", index: 0 },
      });
      expect(table.zones.draw.table).toEqual(["card-1", "card-2", "card-3"]);
      expect(table.visibility["card-1"].faceUp).toBe(faceUp);
      consistent(table);
    },
  );

  test("changing a zone or its host still applies destination visibility", () => {
    const table = createTable();
    flipCardInPlace(table, "card-1", false);
    move(table, "card-1", { zoneId: "hand", hostId: "alice" });
    expect(table.visibility["card-1"].faceUp).toBe(true);
    flipCardInPlace(table, "card-1", false);
    moveComponentToPositionInPlace({
      table,
      definitions: manifest,
      componentId: "card-1",
      at: { zoneId: "hand", hostId: "bob", index: 0 },
    });
    expect(table.visibility["card-1"].faceUp).toBe(true);
    consistent(table);
  });

  test("destination compatibility and host checks reject before unlinking", () => {
    const table = createTable();
    const before = structuredClone(table);
    for (const to of [
      { zoneId: "special" },
      { zoneId: "draw", hostId: "alice" },
      { zoneId: "hand" },
      { zoneId: "hand", hostId: "missing" },
      { zoneId: "missing" },
    ]) {
      expect(() => move(table, "card-1", to)).toThrow();
      expect(table).toEqual(before);
    }
    expect(() => move(table, "card-1", { zoneId: "draw" }, 3)).toThrow();
    expect(table).toEqual(before);
  });

  test("moving into a player zone preserves ownership and recomputes host-based access", () => {
    const table = createTable();
    table.ownerOfCard["card-1"] = "bob";
    move(table, "card-1", { zoneId: "hand", hostId: "alice" });
    expect(table.ownerOfCard["card-1"]).toBe("bob");
    expect(table.visibility["card-1"]).toEqual({
      faceUp: true,
    });
    move(table, "card-1", { zoneId: "public", hostId: "bob" });
    expect(table.ownerOfCard["card-1"]).toBe("bob");
    expect(table.visibility["card-1"]).toEqual({ faceUp: true });
    expect(table.zones.hand[asPlayerId("alice")]).toEqual([]);
    expect(table.zones.hand[asPlayerId("bob")]).toEqual([]);
    consistent(table);
  });

  test("attribution survives reorder and changes only when explicitly supplied", () => {
    const table = createTable();
    moveComponentToZoneInPlace({
      table,
      definitions: manifest,
      componentId: "card-1",
      to: { zoneId: "discard" },
      playedBy: "alice",
    });
    move(table, "card-1", { zoneId: "discard" }, "top");
    expect(table.componentLocations["card-1"]).toMatchObject({
      playedBy: "alice",
    });
    moveComponentToZoneInPlace({
      table,
      definitions: manifest,
      componentId: "card-1",
      to: { zoneId: "draw" },
      playedBy: null,
    });
    expect(table.componentLocations["card-1"]).toMatchObject({
      playedBy: null,
    });
  });

  test("deal takes the available prefix in order, preserving ownership and untouched hosts", () => {
    const table = createTable();
    table.ownerOfCard["card-1"] = "bob";
    dealComponentsInPlace({
      table,
      definitions: manifest,
      from: { zoneId: "draw" },
      to: { zoneId: "hand", hostId: "alice" },
      count: 9,
    });
    expect(table.zones.draw.table).toEqual([]);
    expect(table.zones.hand[asPlayerId("alice")]).toEqual([
      "card-1",
      "card-2",
      "card-3",
    ]);
    expect(table.zones.hand[asPlayerId("bob")]).toEqual([]);
    expect(table.ownerOfCard["card-1"]).toBe("bob");
    expect(table.visibility["card-1"]).toEqual({
      faceUp: true,
    });
    dealComponentsInPlace({
      table,
      definitions: manifest,
      from: { zoneId: "hand", hostId: "alice" },
      to: { zoneId: "public", hostId: "alice" },
      count: 2,
    });
    expect(table.zones.hand[asPlayerId("alice")]).toEqual(["card-3"]);
    expect(table.zones.public[asPlayerId("alice")]).toEqual([
      "card-1",
      "card-2",
    ]);
    consistent(table);
  });

  test("deal validates every selected destination before any mutation", () => {
    const table = createTable();
    move(table, "card-1", { zoneId: "mixed" });
    move(table, "special-card", { zoneId: "mixed" });
    const before = structuredClone(table);
    expect(() =>
      dealComponentsInPlace({
        table,
        definitions: manifest,
        from: { zoneId: "mixed" },
        to: { zoneId: "hand", hostId: "alice" },
        count: 2,
      }),
    ).toThrow();
    expect(table).toEqual(before);
  });

  test("invalid/self deal and malformed source membership leave state unchanged", () => {
    const table = createTable();
    for (const count of [-1, 0.5, Infinity]) {
      const before = structuredClone(table);
      expect(() =>
        dealComponentsInPlace({
          table,
          definitions: manifest,
          from: { zoneId: "draw" },
          to: { zoneId: "hand", hostId: "alice" },
          count,
        }),
      ).toThrow();
      expect(table).toEqual(before);
    }
    expect(() =>
      dealComponentsInPlace({
        table,
        definitions: manifest,
        from: { zoneId: "draw" },
        to: { zoneId: "draw" },
        count: 1,
      }),
    ).toThrow();
    table.componentLocations["card-2"] = { type: "Detached" };
    const before = structuredClone(table);
    expect(() =>
      dealComponentsInPlace({
        table,
        definitions: manifest,
        from: { zoneId: "draw" },
        to: { zoneId: "hand", hostId: "alice" },
        count: 3,
      }),
    ).toThrow();
    expect(table).toEqual(before);
  });

  test("rotation snapshots selections, supports mixed components, preserves ownership and order", () => {
    const table = createTable();
    move(table, "card-1", { zoneId: "hand", hostId: "alice" });
    move(table, "piece", { zoneId: "hand", hostId: "alice" });
    move(table, "die", { zoneId: "hand", hostId: "bob" });
    move(table, "card-2", { zoneId: "hand", hostId: "bob" });
    table.ownerOfCard["card-1"] = "alice";
    rotateZoneInPlace({
      table,
      definitions: manifest,
      zoneId: "hand",
      direction: "left",
      componentIdsByPlayer: { alice: ["piece", "card-1"], bob: ["die"] },
      position: "top",
    });
    expect(table.zones.hand[asPlayerId("alice")]).toEqual(["die"]);
    expect(table.zones.hand[asPlayerId("bob")]).toEqual([
      "piece",
      "card-1",
      "card-2",
    ]);
    expect(table.ownerOfCard["card-1"]).toBe("alice");
    consistent(table);
  });

  test("rotation rejects duplicate players, selections, and source-location disagreement atomically", () => {
    const table = createTable();
    move(table, "card-1", { zoneId: "hand", hostId: "alice" });
    for (const args of [
      { players: ["alice", "alice"] },
      { componentIdsByPlayer: { alice: ["card-1", "card-1"] } },
      { componentIdsByPlayer: { bob: ["card-1"] } },
    ]) {
      const before = structuredClone(table);
      expect(() =>
        rotateZoneInPlace({
          table,
          definitions: manifest,
          zoneId: "hand",
          direction: "left",
          ...args,
        }),
      ).toThrow();
      expect(table).toEqual(before);
    }
  });

  test("transaction shuffle preserves attribution/ownership and detach removes canonical membership", () => {
    const table = createTable();
    const tx = createTestTransaction({ table }, manifest);
    tx.shuffle({ zone: { zoneId: "draw" } });
    expect([...tx.q.zone("draw")].sort()).toEqual([
      "card-1",
      "card-2",
      "card-3",
    ]);
    tx.setComponentOwner({
      componentId: "card-1",
      ownerId: asPlayerId("alice"),
    });
    tx.moveComponentToDetached({ componentId: "card-1" });
    expect(tx.q.zone("draw")).not.toContain("card-1");
    expect(tx.state.table.componentLocations["card-1"]).toEqual({
      type: "Detached",
    });
    expect(tx.state.table.ownerOfCard["card-1"]).toBe("alice");
    consistent(tx.state.table);
    expect(table.zones.draw.table).toEqual(["card-1", "card-2", "card-3"]);
  });
});
