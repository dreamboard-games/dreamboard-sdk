import { describe, expect, it } from "vitest";
import * as z from "zod";
import { compileManifest } from "./manifest/compiler.js";
import { createSeatDisclosure } from "./bundle/trusted/tile-disclosure.js";
import { deriveBoardTopology } from "../shared/board-topology.js";
import { tileSpaceId } from "../shared/domain/tile-space.js";
import { perPlayerInstanceId } from "../shared/domain/per-player-instance.js";
import type { RuntimeTableRecord, ZoneDefinitions } from "./model/table.js";

const basis = { sessionId: "session", version: 1 };
const appearance: import("../shared/domain/tile-disclosure.js").PublicTileAppearance =
  {
    layout: "hex",
    cells: [{ q: 0, r: 0 }],
    backImage: "assets/back.png",
  };
const source = {
  players: { minPlayers: 2, maxPlayers: 2 },
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
          cardType: "cards",
          properties: {},
        },
      ],
    },
  ],
  boards: [
    { id: "map", name: "Map", layout: "hex", scope: "shared" },
    { id: "other", name: "Other", layout: "hex", scope: "shared" },
    { id: "private", name: "Private", layout: "hex", scope: "perPlayer" },
  ],
  tileTypes: [
    {
      id: "plain",
      name: "Plain",
      layout: "hex",
      cells: [{ id: "cell", at: { q: 0, r: 0 } }],
      propertiesSchema: z.object({ secret: z.int().default(0) }),
    },
    {
      id: "secret",
      name: "Secret",
      layout: "hex",
      cells: [
        { id: "different", at: { q: 0, r: 0 } },
        { id: "far", at: { q: 1, r: 0 } },
      ],
      edges: [{ cellId: "different", side: 0, fields: { secret: "edge" } }],
      vertices: [
        { cellId: "different", corner: 0, fields: { secret: "vertex" } },
      ],
      propertiesSchema: z.object({ secret: z.int().default(0) }),
    },
  ],
  tileSeeds: [
    { id: "a", typeId: "plain" },
    { id: "b", typeId: "secret" },
    { id: "c", typeId: "plain" },
  ],
  pieceTypes: [{ id: "pawn", name: "Pawn" }],
  pieceSeeds: [{ id: "pawn", typeId: "pawn" }],
  dieTypes: [{ id: "die", name: "Die", sides: 6 }],
  dieSeeds: [{ id: "die", typeId: "die" }],
  zones: [
    { id: "bag", name: "Bag", scope: "shared", visibility: "hidden" },
    { id: "hand", name: "Hand", scope: "perPlayer", visibility: "ownerOnly" },
    {
      id: "cargo",
      name: "Cargo",
      attachedTo: { tileType: "plain", cell: "cell" },
      visibility: "ownerOnly",
    },
    {
      id: "pawnCargo",
      name: "Pawn cargo",
      attachedTo: { pieceType: "pawn" },
      visibility: "public",
    },
    {
      id: "dieCargo",
      name: "Die cargo",
      attachedTo: { dieType: "die" },
      visibility: "public",
    },
  ],
} as const;
function fixture() {
  const compiled = compileManifest(source);
  const table: RuntimeTableRecord = compiled.createInitialTable({
    playerIds: ["north", "south"],
  });
  const definitions: ZoneDefinitions = compiled;
  return { table, definitions, compiled };
}
function placed(
  table: RuntimeTableRecord,
  tileId: string,
  boardId = "map",
  q = 0,
) {
  table.componentLocations[tileId] = {
    type: "OnBoard",
    boardId,
    layout: "hex",
    q,
    r: 0,
    rotation: 0,
  };
}
function seat(
  table: RuntimeTableRecord,
  definitions: ZoneDefinitions,
  player = "north",
  version = 1,
  sessionId = "session",
) {
  return createSeatDisclosure(table, definitions, player, {
    sessionId,
    version,
  });
}
function publicContext(context: ReturnType<typeof seat>) {
  return {
    boards: context.boards,
    zones: context.zones.map(({ zoneId, seatHostId, tiles }) => ({
      zoneId,
      hostId: seatHostId,
      tiles,
    })),
  };
}

describe("canonical seat disclosure", () => {
  it("draws hidden bag backs, admits private hand faces, and reveals public placement", () => {
    const { table, definitions } = fixture();
    table.tiles.a.disclosure = {
      face: { audience: "public" },
      appearance: structuredClone(appearance),
    };
    table.zones.bag.table = ["a"];
    table.componentLocations.a = {
      type: "InZone",
      zoneId: "bag",
      hostId: "table",
      playedBy: null,
    };
    expect(seat(table, definitions).tile("a")?.disclosure).toBe("concealed");
    table.zones.bag.table = [];
    table.zones.hand.north = ["a"];
    table.componentLocations.a = {
      type: "InZone",
      zoneId: "hand",
      hostId: "north",
      playedBy: null,
    };
    expect(seat(table, definitions).tile("a")?.disclosure).toBe("visible");
    expect(seat(table, definitions, "south").tile("a")).toBeNull();
    table.zones.hand.north = [];
    placed(table, "a");
    expect(seat(table, definitions, "south").tile("a")?.disclosure).toBe(
      "visible",
    );
  });
  it("recalculates tile-owned face and attached host admission on ownership transfer", () => {
    const { table, definitions } = fixture();
    placed(table, "a");
    table.tiles.a.ownerId = "north";
    table.tiles.a.disclosure = {
      face: { audience: "owner" },
      appearance: structuredClone(appearance),
    };
    const hostId = tileSpaceId("a", "cell");
    table.zones.cargo[hostId] = [];
    expect(
      seat(table, definitions).zones.some((z) => z.zoneId === "cargo"),
    ).toBe(true);
    expect(
      seat(table, definitions, "south").zones.some((z) => z.zoneId === "cargo"),
    ).toBe(false);
    table.tiles.a.ownerId = "south";
    expect(seat(table, definitions).tile("a")?.disclosure).toBe("concealed");
    expect(
      seat(table, definitions).zones.some((z) => z.zoneId === "cargo"),
    ).toBe(false);
    expect(
      seat(table, definitions, "south").zones.some((z) => z.zoneId === "cargo"),
    ).toBe(true);
  });
  it("reveals a private board explicitly without replication granting privacy", () => {
    const { table, definitions } = fixture();
    const boardId = perPlayerInstanceId("board", "private", "north");
    placed(table, "a", boardId);
    expect(seat(table, definitions, "south").boards[boardId]).toBeDefined();
    table.boards[boardId].visibility = "ownerOnly";
    expect(seat(table, definitions, "south").boards[boardId]).toBeUndefined();
    expect(seat(table, definitions).tile("a")?.disclosure).toBe("visible");
    table.boards[boardId].visibility = "public";
    expect(seat(table, definitions, "south").tile("a")?.disclosure).toBe(
      "visible",
    );
  });
  it("named face seats cannot exceed a private location or hidden face cap", () => {
    const { table, definitions } = fixture();
    table.tiles.a.disclosure = {
      face: { audience: "seats", playerIds: ["south"] },
      appearance: structuredClone(appearance),
    };
    table.zones.hand.north = ["a"];
    table.componentLocations.a = {
      type: "InZone",
      zoneId: "hand",
      hostId: "north",
      playedBy: null,
    };
    expect(seat(table, definitions, "south").tile("a")).toBeNull();
    expect(seat(table, definitions).tile("a")?.disclosure).toBe("concealed");
    table.zones.hand.north = [];
    table.zones.bag.table = ["a"];
    table.componentLocations.a = {
      type: "InZone",
      zoneId: "bag",
      hostId: "table",
      playedBy: null,
    };
    expect(seat(table, definitions, "south").tile("a")?.disclosure).toBe(
      "concealed",
    );
  });
  it("builds geometry and world metadata exclusively from visible contributors", () => {
    const { table, definitions } = fixture();
    placed(table, "a");
    placed(table, "b", "map", 20);
    table.tiles.b.disclosure = {
      face: { audience: "none" },
      appearance: structuredClone(appearance),
    };
    const context = seat(table, definitions);
    const board = context.boards.map;
    expect(board.layout).toBe("hex");
    if (board.layout !== "hex") throw new Error("Expected hex");
    expect(Object.values(board.spaces)).toHaveLength(1);
    expect(Object.values(board.spaces).map((space) => space.q)).toEqual([0]);
    expect(
      board.tiles.find((tile) => tile.disclosure === "concealed"),
    ).toMatchObject({ appearance });
    expect(
      board.edges.every((edge) => Object.keys(edge.fields).length === 0),
    ).toBe(true);
    expect(
      board.vertices.every((vertex) => Object.keys(vertex.fields).length === 0),
    ).toBe(true);
    expect(
      [...board.edges, ...board.vertices].every(
        (item) => item.spaceIds.length === 1,
      ),
    ).toBe(true);
    expect(
      context.boardTarget("space", "map", tileSpaceId("b", "far")),
    ).toBeNull();
  });
  it.each(["OnSpace", "OnEdge", "OnVertex"] as const)(
    "denies cards, pieces and dice on undisclosed %s hosts",
    (type) => {
      const { table, definitions } = fixture();
      placed(table, "b");
      const topology = deriveBoardTopology(table, definitions, "map");
      if (topology.layout !== "hex") throw new Error("Expected hex");
      table.tiles.b.disclosure = {
        face: { audience: "none" },
        appearance: structuredClone(appearance),
      };
      for (const id of ["card", "pawn", "die"]) {
        table.componentLocations[id] =
          type === "OnSpace"
            ? { type, boardId: "map", spaceId: tileSpaceId("b", "different") }
            : type === "OnEdge"
              ? { type, boardId: "map", edgeId: topology.edges[0].id }
              : { type, boardId: "map", vertexId: topology.vertices[0].id };
      }
      const context = seat(table, definitions);
      for (const id of ["card", "pawn", "die"])
        expect(context.locationAccess(id)).toEqual({
          inventory: false,
          face: false,
        });
      expect(
        context.zones.some((zone) =>
          ["pawnCargo", "dieCargo"].includes(zone.zoneId),
        ),
      ).toBe(false);
    },
  );
  it("preserves complete public context when secret assignments, order, mutable data and geometry differ", () => {
    const { table, definitions } = fixture();
    table.tiles.a.disclosure = {
      face: { audience: "none" },
      appearance: structuredClone(appearance),
    };
    table.tiles.b.disclosure = {
      face: { audience: "none" },
      appearance: structuredClone(appearance),
    };
    table.zones.bag.table = ["a", "b"];
    for (const id of ["a", "b"])
      table.componentLocations[id] = {
        type: "InZone",
        zoneId: "bag",
        hostId: "table",
        playedBy: null,
      };
    const baseline = publicContext(seat(table, definitions));
    table.zones.bag.table.reverse();
    [table.tiles.a.tileTypeId, table.tiles.b.tileTypeId] = [
      table.tiles.b.tileTypeId,
      table.tiles.a.tileTypeId,
    ];
    table.tiles.a.properties.secret = 123;
    table.tiles.b.properties.secret = 456;
    expect(publicContext(seat(table, definitions))).toEqual(baseline);
    placed(table, "a", "map", 20);
    placed(table, "b", "map", 30);
    const placedBaseline = publicContext(seat(table, definitions));
    [table.tiles.a.tileTypeId, table.tiles.b.tileTypeId] = [
      table.tiles.b.tileTypeId,
      table.tiles.a.tileTypeId,
    ];
    expect(publicContext(seat(table, definitions))).toEqual(placedBaseline);
  });
  it("omitted bag entries leave no ordinal gaps or count clues", () => {
    const { table, definitions } = fixture();
    table.tiles.a.disclosure = { face: { audience: "none" } };
    table.tiles.b.disclosure = {
      face: { audience: "none" },
      appearance: structuredClone(appearance),
    };
    table.zones.bag.table = ["a", "b"];
    for (const id of ["a", "b"])
      table.componentLocations[id] = {
        type: "InZone",
        zoneId: "bag",
        hostId: "table",
        playedBy: null,
      };
    const before = publicContext(seat(table, definitions));
    table.zones.bag.table = ["b"];
    table.componentLocations.a = { type: "Detached" };
    expect(publicContext(seat(table, definitions))).toEqual(before);
  });
  it("rejects stale, other-seat and other-session references", () => {
    const { table, definitions } = fixture();
    placed(table, "a");
    const context = createSeatDisclosure(table, definitions, "north", basis);
    const ref = context.tileRef("a")!;
    expect(context.tileId(ref)).toBe("a");
    expect(seat(table, definitions, "north", 2).tileId(ref)).toBeNull();
    expect(seat(table, definitions, "south").tileId(ref)).toBeNull();
    expect(
      seat(table, definitions, "north", 1, "other-session").tileId(ref),
    ).toBeNull();
    expect(context.tileId("a")).toBeNull();
  });
  it("rejects a space reference submitted against a different visible board", () => {
    const { table, definitions } = fixture();
    placed(table, "a", "map");
    placed(table, "c", "other");
    const context = seat(table, definitions);
    const spaceId = tileSpaceId("c", "cell");
    const ref = context.boardTarget("space", "other", spaceId)!;
    expect(context.boardTarget("space", "map", spaceId)).toBeNull();
    expect(context.authoritativeBoardTarget("space", "map", ref)).toBeNull();
  });
});
