import * as z from "zod";
import { describe, expect, test } from "vitest";
import { compileManifest } from "../manifest/compiler";
import { assertZoneConsistency } from "./zones";

const manifest = compileManifest({
  players: { minPlayers: 2, maxPlayers: 2 },
  zones: [
    { id: "supply", name: "Supply", scope: "shared" },
    { id: "hand", name: "Hand", scope: "perPlayer" },
  ],
  cardSets: [
    {
      id: "cards",
      name: "Cards",
      cardSchema: z.object({}),
      defaultHome: { type: "zone", zoneId: "supply" },
      cards: [
        {
          id: "card",
          name: "Card",
          cardType: "card",
          count: 1,
          properties: {},
        },
      ],
    },
  ],
  pieceTypes: [{ id: "token", name: "Token" }],
  pieceSeeds: [
    { id: "piece", typeId: "token", home: { type: "zone", zoneId: "supply" } },
  ],
  dieTypes: [{ id: "d6", name: "D6", sides: 6 }],
  dieSeeds: [
    { id: "die", typeId: "d6", home: { type: "zone", zoneId: "supply" } },
  ],
});
const createTable = () =>
  manifest.createInitialTable({ playerIds: ["alice", "table"] });

describe("zone restore invariants", () => {
  test("validates mixed inventory and distinguishes a player named table from the shared host", () => {
    const table = createTable();
    expect(table.zones.supply.table).toEqual(["card", "piece", "die"]);
    expect(table.zones.hand).toEqual({ alice: [], table: [] });
    expect(() => assertZoneConsistency(table, manifest)).not.toThrow();
  });

  test.each([
    "duplicate",
    "missing",
    "wrong-host",
    "unknown",
    "reverse",
    "inactive-attribution",
  ])("rejects %s membership", (kind) => {
    const table = createTable();
    if (kind === "duplicate") table.zones.supply.table.push("card");
    if (kind === "missing") table.zones.supply.table.shift();
    if (kind === "wrong-host") {
      table.zones.supply.table.splice(0, 1);
      table.componentLocations.card = {
        type: "InZone",
        zoneId: "hand",
        hostId: "missing",
        playedBy: null,
      };
    }
    if (kind === "unknown") {
      // @ts-expect-error Explicit runtime-invalid membership.
      table.zones.supply.table.push("unknown");
    }
    if (kind === "inactive-attribution")
      table.componentLocations.card = {
        type: "InZone",
        zoneId: "supply",
        hostId: "table",
        playedBy: "former-player",
      };
    if (kind === "reverse")
      table.componentLocations.card = { type: "Detached" };
    expect(() => assertZoneConsistency(table, manifest)).toThrow();
    expect(manifest.tableSchema.safeParse(table).success).toBe(false);
  });

  test("checks global component identity before schema stripping can hide cross-family duplicates", () => {
    const table = createTable();
    Object.assign(table.pieces, {
      card: { ...table.pieces.piece, id: "card" },
    });
    expect(() => assertZoneConsistency(table, manifest)).toThrow(
      "Duplicate component id",
    );
    expect(manifest.tableSchema.safeParse(table).success).toBe(false);
  });

  test("rejects missing component locations and stale or missing hosts", () => {
    const table = createTable();
    Reflect.deleteProperty(table.componentLocations, "piece");
    expect(() => assertZoneConsistency(table, manifest)).toThrow(
      "Missing location",
    );
    const wrongHosts = createTable();
    Reflect.deleteProperty(wrongHosts.zones.hand, "table");
    expect(() => assertZoneConsistency(wrongHosts, manifest)).toThrow(
      "hosts do not match",
    );
  });
});
