import { describe, expect, test } from "vitest";
import type { RuntimeTableRecord, ZoneDefinitions } from "../model";
import { perPlayerInstanceId } from "../../shared/domain/per-player-instance";
import { boardSpaceHostId } from "../../shared/domain/board-space-host";
import {
  moveComponentToZoneInPlace,
  dealComponentsInPlace,
} from "./card-mutations";
import {
  assertContainmentAcyclic,
  assertZoneConsistency,
  enumerateZoneHosts,
  resolveZone,
  resolveZoneAccess,
  resolveZoneOwner,
} from "./zones";

const definitions: ZoneDefinitions = {
  zoneDefinitions: {
    cargo: {
      attachedTo: { pieceType: "ship" },
      visibility: "ownerOnly",
      allowedCardSetIds: [],
    },
    vault: {
      attachedTo: { dieType: "d6" },
      visibility: "hidden",
      allowedCardSetIds: [],
    },
    market: {
      attachedTo: { board: "map" },
      visibility: "hidden",
      allowedCardSetIds: [],
    },
    harbor: {
      attachedTo: { board: "map", space: "port:#雪" },
      visibility: "public",
      allowedCardSetIds: [],
    },
  },
};
function table(): RuntimeTableRecord {
  return {
    playerOrder: ["alice", "table"],
    cards: {},
    pieces: {
      a: { id: "a", pieceTypeId: "ship", ownerId: "alice", properties: {} },
      b: { id: "b", pieceTypeId: "ship", ownerId: "table", properties: {} },
      c: { id: "c", pieceTypeId: "crate", properties: {} },
    },
    dice: {
      die: {
        id: "die",
        dieTypeId: "d6",
        ownerId: "alice",
        sides: 6,
        properties: {},
      },
    },
    componentLocations: {
      a: { type: "Detached" },
      b: { type: "Detached" },
      c: { type: "Detached" },
      die: { type: "Detached" },
    },
    zones: {
      cargo: { a: [], b: [] },
      vault: { die: [] },
      market: { map: [] },
      harbor: { [boardSpaceHostId("map", "port:#雪")]: [] },
    },
    boards: {
      byId: {
        map: {
          id: "map",
          scope: "shared",
          layout: "generic",
          fields: {},
          relations: [],
          spaces: { "port:#雪": { id: "port:#雪", fields: {} } },
        },
      },
      hex: {},
      square: {},
      network: {},
      track: {},
    },
    resources: {},
    ownerOfCard: {},
    visibility: {},
  };
}
describe("attached zone runtime admission", () => {
  test("enumerates actual host families and admits encoded board-space hosts", () => {
    const state = table();
    expect(
      enumerateZoneHosts(state, definitions.zoneDefinitions.cargo),
    ).toEqual(["a", "b"]);
    expect(
      enumerateZoneHosts(state, definitions.zoneDefinitions.vault),
    ).toEqual(["die"]);
    expect(
      resolveZone(state, definitions, {
        zoneId: "harbor",
        hostId: boardSpaceHostId("map", "port:#雪"),
      }).ids,
    ).toEqual([]);
    expect(() =>
      resolveZone(state, definitions, { zoneId: "cargo", hostId: "c" }),
    ).toThrow("Invalid zone host");
    expect(() =>
      resolveZone(state, definitions, {
        zoneId: "harbor",
        hostId: boardSpaceHostId("map", "missing"),
      }),
    ).toThrow("Invalid zone host");
    expect(() => assertZoneConsistency(state, definitions)).not.toThrow();
  });
  test("rejects self and transitive containment before unlinking", () => {
    const state = table();
    expect(() =>
      moveComponentToZoneInPlace({
        table: state,
        definitions,
        componentId: "a",
        to: { zoneId: "cargo", hostId: "a" },
      }),
    ).toThrow("Containment cycle");
    moveComponentToZoneInPlace({
      table: state,
      definitions,
      componentId: "a",
      to: { zoneId: "cargo", hostId: "b" },
    });
    const before = structuredClone(state);
    expect(() =>
      moveComponentToZoneInPlace({
        table: state,
        definitions,
        componentId: "b",
        to: { zoneId: "cargo", hostId: "a" },
      }),
    ).toThrow("Containment cycle");
    expect(state).toEqual(before);
  });
  test("validates the complete proposed graph and rejects cyclic restores", () => {
    const state = table();
    expect(() =>
      assertContainmentAcyclic(state, definitions, {
        a: { type: "InZone", zoneId: "cargo", hostId: "b", playedBy: null },
        b: { type: "InZone", zoneId: "cargo", hostId: "a", playedBy: null },
      }),
    ).toThrow("Containment cycle");
    state.componentLocations.a = {
      type: "InZone",
      zoneId: "cargo",
      hostId: "b",
      playedBy: null,
    };
    state.componentLocations.b = {
      type: "InZone",
      zoneId: "cargo",
      hostId: "a",
      playedBy: null,
    };
    state.zones.cargo.a = ["b"];
    state.zones.cargo.b = ["a"];
    expect(() => assertZoneConsistency(state, definitions)).toThrow(
      "Containment cycle",
    );
  });
  test("bulk deals prevalidate containment and preserve order on rejection", () => {
    const state = table();
    moveComponentToZoneInPlace({
      table: state,
      definitions,
      componentId: "a",
      to: { zoneId: "cargo", hostId: "b" },
    });
    moveComponentToZoneInPlace({
      table: state,
      definitions,
      componentId: "c",
      to: { zoneId: "cargo", hostId: "b" },
    });
    const before = structuredClone(state);
    expect(() =>
      dealComponentsInPlace({
        table: state,
        definitions,
        from: { zoneId: "cargo", hostId: "b" },
        to: { zoneId: "cargo", hostId: "a" },
        count: 2,
      }),
    ).toThrow("Containment cycle");
    expect(state).toEqual(before);
  });
  test("current host ownership changes access without changing child ownership", () => {
    const state = table();
    moveComponentToZoneInPlace({
      table: state,
      definitions,
      componentId: "c",
      to: { zoneId: "cargo", hostId: "a" },
    });
    expect(
      resolveZoneAccess(state, definitions.zoneDefinitions.cargo, "a", "alice"),
    ).toBe(true);
    state.pieces.a.ownerId = "table";
    expect(
      resolveZoneOwner(state, definitions.zoneDefinitions.cargo, "a"),
    ).toBe("table");
    expect(
      resolveZoneAccess(state, definitions.zoneDefinitions.cargo, "a", "alice"),
    ).toBe(false);
    expect(
      resolveZoneAccess(state, definitions.zoneDefinitions.cargo, "a", "table"),
    ).toBe(true);
    expect(state.pieces.c.ownerId).toBeUndefined();
    state.pieces.a.ownerId = null;
    expect(
      resolveZoneAccess(state, definitions.zoneDefinitions.cargo, "a", "table"),
    ).toBe(false);
    expect(
      resolveZoneAccess(
        state,
        definitions.zoneDefinitions.market,
        "map",
        "alice",
      ),
    ).toBe(true);
  });
  test("per-player board and space audiences use actual replication hosts", () => {
    const state = table();
    const boardId = perPlayerInstanceId("board", "mat", "table");
    state.boards.byId[boardId] = {
      id: boardId,
      baseId: "mat",
      scope: "perPlayer",
      playerId: "table",
      layout: "hex",
      orientation: "pointy",
      fields: {},
      relations: [],
      spaces: { "cell:#": { id: "cell:#", q: 0, r: 0, fields: {} } },
      edges: [],
      vertices: [],
    };
    const definition = {
      attachedTo: { board: "mat", space: "cell:#" },
      visibility: "hidden",
      allowedCardSetIds: [],
    } as const;
    const host = boardSpaceHostId(boardId, "cell:#");
    expect(enumerateZoneHosts(state, definition)).toEqual([host]);
    expect(resolveZoneAccess(state, definition, host, "table")).toBe(true);
    expect(resolveZoneAccess(state, definition, host, "alice")).toBe(false);
    const forged = boardSpaceHostId(
      perPlayerInstanceId("board", "mat", "absent"),
      "cell:#",
    );
    expect(() => resolveZoneAccess(state, definition, forged, "table")).toThrow(
      "Invalid zone host",
    );
  });
  test("rejects cycles spanning piece and die hosts", () => {
    const state = table();
    expect(() =>
      assertContainmentAcyclic(state, definitions, {
        a: { type: "InZone", zoneId: "vault", hostId: "die", playedBy: null },
        die: { type: "InZone", zoneId: "cargo", hostId: "b", playedBy: null },
        b: { type: "InZone", zoneId: "cargo", hostId: "a", playedBy: null },
      }),
    ).toThrow("Containment cycle");
  });
});
