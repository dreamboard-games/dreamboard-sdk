import { describe, expect, test } from "vitest";
import type { RuntimeTableRecord, ZoneDefinitions } from "../model";
import { createTableQueries } from "../table-queries";
import { createTestTransaction } from "../transaction-test-fixtures";
import { cloneRuntimeTable } from "./clone";
import {
  dealComponentsInPlace,
  moveComponentToZoneInPlace,
} from "./card-mutations";
import {
  moveComponentToSpaceInPlace,
  moveComponentToEdgeInPlace,
  moveComponentToVertexInPlace,
} from "./component-mutations";
import { assertZoneConsistency } from "./zones";
const definitions: ZoneDefinitions = {
  zoneDefinitions: {
    supply: { scope: "shared", visibility: "public", allowedCardSetIds: [] },
    destination: {
      scope: "shared",
      visibility: "public",
      allowedCardSetIds: [],
    },
    hidden: { scope: "shared", visibility: "hidden", allowedCardSetIds: [] },
    hand: {
      scope: "perPlayer",
      visibility: "ownerOnly",
      allowedCardSetIds: [],
    },
  },
};
function table(): RuntimeTableRecord {
  return {
    playerOrder: ["alice", "bob"],
    zones: {
      supply: { table: ["card", "tile", "piece", "die"] },
      destination: { table: [] },
      hidden: { table: [] },
      hand: { alice: [], bob: [] },
    },
    cards: {
      card: {
        id: "card",
        cardSetId: "cards",
        cardType: "card",
        properties: {},
      },
    },
    pieces: { piece: { id: "piece", pieceTypeId: "pawn", properties: {} } },
    dice: { die: { id: "die", dieTypeId: "d6", sides: 6, properties: {} } },
    tiles: {
      tile: {
        componentType: "tile",
        id: "tile",
        tileTypeId: "island",
        ownerId: "alice",
        properties: { markers: { count: 2 } },
      },
    },
    componentLocations: Object.fromEntries(
      ["card", "tile", "piece", "die"].map((id) => [
        id,
        { type: "InZone", zoneId: "supply", hostId: "table", playedBy: null },
      ]),
    ),
    resources: {},
    ownerOfCard: { card: null },
    visibility: { card: { faceUp: true } },
    boards: { byId: {}, hex: {}, square: {}, network: {}, track: {} },
  };
}
describe("tile inventory operations", () => {
  test("queries tile data without copying definitions and transfers ownership independently", () => {
    const original = table();
    const q = createTableQueries(original, definitions);
    expect(q.tile("tile")).toBe(original.tiles.tile);
    expect(q.component.data("tile")).toBe(original.tiles.tile);
    expect(() => q.tile("missing")).toThrow('Tile "missing" is not present.');
    const changed = createTestTransaction(
      { table: original },
      definitions,
    ).setComponentOwner({ componentId: "tile", ownerId: "bob" }).table;
    expect(changed.tiles.tile.ownerId).toBe("bob");
    expect(changed.tiles.tile.tileTypeId).toBe("island");
    expect(changed.tiles.tile.properties).toEqual({ markers: { count: 2 } });
    expect(changed.zones.supply.table).toEqual(original.zones.supply.table);
    expect(changed.componentLocations.tile).toEqual(
      original.componentLocations.tile,
    );
    expect(original.tiles.tile.ownerId).toBe("alice");
  });
  test("clones mutable tile properties independently", () => {
    const original = table();
    const cloned = cloneRuntimeTable(original);
    expect(cloned.tiles).not.toBe(original.tiles);
    expect(cloned.tiles.tile.properties.markers).not.toBe(
      original.tiles.tile.properties.markers,
    );
    cloned.tiles.tile.properties.markers = { count: 9 };
    expect(original.tiles.tile.properties.markers).toEqual({ count: 2 });
  });
  test("mixed public dealing and movement keep canonical order and ownership", () => {
    const state = table();
    dealComponentsInPlace({
      table: state,
      definitions,
      from: { zoneId: "supply" },
      to: { zoneId: "destination" },
      count: 3,
    });
    expect(state.zones.destination.table).toEqual(["card", "tile", "piece"]);
    expect(state.zones.supply.table).toEqual(["die"]);
    expect(state.tiles.tile.ownerId).toBe("alice");
    moveComponentToZoneInPlace({
      table: state,
      definitions,
      componentId: "tile",
      to: { zoneId: "supply" },
      position: "top",
    });
    expect(state.zones.supply.table).toEqual(["tile", "die"]);
    expect(state.componentLocations.tile).toEqual({
      type: "InZone",
      zoneId: "supply",
      hostId: "table",
      playedBy: null,
    });
    expect(() => assertZoneConsistency(state, definitions)).not.toThrow();
  });
  test.each(["hidden", "hand"])(
    "rejects tile moves and mixed deals into %s before any write",
    (zoneId) => {
      const state = table();
      const before = structuredClone(state);
      const to = { zoneId, hostId: zoneId === "hand" ? "alice" : "table" };
      expect(() =>
        moveComponentToZoneInPlace({
          table: state,
          definitions,
          componentId: "tile",
          to,
        }),
      ).toThrow("Tiles require public");
      expect(state).toEqual(before);
      expect(() =>
        dealComponentsInPlace({
          table: state,
          definitions,
          from: { zoneId: "supply" },
          to,
          count: 3,
        }),
      ).toThrow("Tiles require public");
      expect(state).toEqual(before);
    },
  );
  test.each(["space", "edge", "vertex"])(
    "rejects tile %s placement before resolving or unlinking",
    (kind) => {
      const state = table();
      const before = structuredClone(state);
      const operation =
        kind === "space"
          ? moveComponentToSpaceInPlace
          : kind === "edge"
            ? moveComponentToEdgeInPlace
            : moveComponentToVertexInPlace;
      expect(
        () =>
          void Reflect.apply(operation, undefined, [
            state,
            "tile",
            "missing-board",
            "missing-element",
            definitions,
          ]),
      ).toThrow("Tiles cannot use spatial");
      expect(state).toEqual(before);
    },
  );
  test("rejects tiles with unsupported restored locations or nonpublic membership", () => {
    const state = table();
    state.zones.supply.table.splice(1, 1);
    state.componentLocations.tile = {
      type: "OnSpace",
      boardId: "missing",
      spaceId: "missing",
    };
    expect(() => assertZoneConsistency(state, definitions)).toThrow(
      "Tiles may only",
    );
    state.componentLocations.tile = {
      type: "InZone",
      zoneId: "hidden",
      hostId: "table",
      playedBy: null,
    };
    state.zones.hidden.table = ["tile"];
    expect(() => assertZoneConsistency(state, definitions)).toThrow(
      "Tiles require public",
    );
  });
  test("rejects global component ID collisions involving tiles", () => {
    const state = table();
    state.tiles.piece = { ...state.tiles.tile, id: "piece" };
    expect(() => assertZoneConsistency(state, definitions)).toThrow(
      "Duplicate component id",
    );
  });
});
