import * as z from "zod";
import { expect, test } from "vitest";
import { compileManifest } from "../manifest/compiler";
import { tileSpaceId } from "../../shared/domain/tile-space";
import { moveComponentToZoneInPlace } from "./card-mutations";
import { assertZoneConsistency, resolveZoneAccess } from "./zones";
import { createTestTransaction } from "../transaction-test-fixtures";

const manifest = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  boards: [{ id: "map", name: "Map", layout: "square", scope: "shared" }],
  tileTypes: [
    {
      id: "island",
      name: "Island",
      layout: "square",
      cells: [{ id: "land", at: { col: 0, row: 0 } }],
    },
  ],
  tileSeeds: [{ id: "island", typeId: "island", home: { type: "detached" } }],
  cardSets: [
    {
      id: "cards",
      name: "Cards",
      cardSchema: z.object({}),
      defaultHome: { type: "detached" },
      cards: [
        {
          id: "card",
          name: "Card",
          count: 1,
          cardType: "card",
          properties: {},
        },
      ],
    },
  ],
  zones: [
    {
      id: "cell",
      name: "Cell",
      attachedTo: { tileType: "island", cell: "land" },
      visibility: "ownerOnly",
    },
  ],
});

test("empty tile-cell hosts exist while detached, but contents require live placement", () => {
  const table = manifest.createInitialTable({ playerIds: ["alice", "bob"] });
  const hostId = tileSpaceId("island", "land");
  expect(table.zones.cell[hostId]).toEqual([]);
  const before = structuredClone(table);
  expect(() =>
    moveComponentToZoneInPlace({
      table,
      definitions: manifest,
      componentId: "card",
      to: { zoneId: "cell", hostId },
    }),
  ).toThrow();
  expect(table).toEqual(before);
  table.componentLocations.island = {
    type: "OnBoard",
    layout: "square",
    boardId: "map",
    col: -3,
    row: 4,
    rotation: 1,
  };
  assertZoneConsistency(table, manifest);
  moveComponentToZoneInPlace({
    table,
    definitions: manifest,
    componentId: "card",
    to: { zoneId: "cell", hostId },
  });
  expect(table.zones.cell[hostId]).toEqual(["card"]);
  expect(table.componentLocations.card).toEqual({
    type: "InZone",
    zoneId: "cell",
    hostId,
    playedBy: null,
  });
  assertZoneConsistency(table, manifest);
  const owned = createTestTransaction({ table }, manifest).setComponentOwner({
    componentId: "island",
    ownerId: manifest.ids.playerId.parse("alice"),
  }).table;
  expect(
    resolveZoneAccess(
      owned,
      manifest,
      manifest.zoneDefinitions.cell,
      hostId,
      "alice",
    ),
  ).toBe(true);
  expect(
    resolveZoneAccess(
      owned,
      manifest,
      manifest.zoneDefinitions.cell,
      hostId,
      "bob",
    ),
  ).toBe(false);
  const transferred = createTestTransaction(
    { table: owned },
    manifest,
  ).setComponentOwner({
    componentId: "island",
    ownerId: manifest.ids.playerId.parse("bob"),
  }).table;
  expect(
    resolveZoneAccess(
      transferred,
      manifest,
      manifest.zoneDefinitions.cell,
      hostId,
      "alice",
    ),
  ).toBe(false);
  expect(
    resolveZoneAccess(
      transferred,
      manifest,
      manifest.zoneDefinitions.cell,
      hostId,
      "bob",
    ),
  ).toBe(true);
  const detached = structuredClone(transferred);
  detached.componentLocations.island = { type: "Detached" };
  expect(() => assertZoneConsistency(detached, manifest)).toThrow();
});
