import * as z from "zod";
import { describe, expect, test } from "vitest";
import { nextRandomInt } from "../rng";
import type { RuntimeRngState } from "../model";
import { compileManifest } from "../manifest/compiler";
import type { RuntimeTableRecord } from "../model";
import { deriveBoardTopology } from "../../shared/board-topology";
import { TilePlacementSchema } from "../../shared/domain/tile-placement";
import { MAXIMUM_BOARD_COORDINATE } from "../../shared/domain/board-coordinates";
import { tileSpaceId } from "../../shared/domain/tile-space";
import { assertZoneConsistency } from "./zones";
import { moveComponentToZoneInPlace } from "./card-mutations";
import { moveComponentToDetachedInPlace } from "./component-mutations";
import { placeTileInPlace, removeTileInPlace } from "./tile-mutations";

const manifest = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  boards: ["map", "other"].map((id) => ({
    id,
    name: id,
    layout: "square" as const,
    scope: "shared" as const,
  })),
  tileTypes: [
    {
      id: "island",
      name: "Island",
      layout: "square",
      cells: [
        { id: "land", at: { col: 0, row: 0 } },
        { id: "shore", at: { col: 1, row: 0 } },
      ],
    },
  ],
  tileSeeds: [
    { id: "a", typeId: "island", home: { type: "zone", zoneId: "bag" } },
    { id: "b", typeId: "island" },
  ],
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
    { id: "bag", name: "Bag", scope: "shared", visibility: "hidden" },
    {
      id: "cell",
      name: "Cell",
      attachedTo: { tileType: "island", cell: "land" },
      visibility: "public",
    },
  ],
});
function fixture() {
  const table: RuntimeTableRecord = manifest.createInitialTable({
    playerIds: ["alice"],
  });
  const place = (
    tileId = "a",
    boardId = "map",
    col = 0,
    rotation: 0 | 1 | 2 | 3 = 0,
  ) =>
    placeTileInPlace({
      table,
      definitions: manifest,
      tileId,
      boardId,
      at: { col, row: 0, rotation },
    });
  return { table, place };
}
function atomic(
  table: RuntimeTableRecord,
  action: () => void,
  message?: string,
) {
  const before = structuredClone(table);
  expect(action).toThrow(message);
  expect(table).toEqual(before);
}

describe("canonical tile placement", () => {
  test("places from ordered inventory, moves and removes without a second placement store", () => {
    const { table, place } = fixture();
    place();
    expect(table.zones.bag.table).toEqual([]);
    expect(
      Object.keys(deriveBoardTopology(table, manifest, "map").spaces),
    ).toHaveLength(2);
    place("a", "map", 5, 1);
    expect(table.componentLocations.a).toMatchObject({ col: 5, rotation: 1 });
    removeTileInPlace({
      table,
      definitions: manifest,
      tileId: "a",
      boardId: "map",
    });
    expect(table.componentLocations.a).toEqual({ type: "Detached" });
    assertZoneConsistency(table, manifest);
  });
  test("invalid placement and membership failures leave inventory and locations untouched", () => {
    const { table, place } = fixture();
    atomic(table, () => place("a", "missing"));
    place("b");
    atomic(table, () => place(), "Overlapping");
    atomic(table, () =>
      placeTileInPlace({
        table,
        definitions: manifest,
        boardId: "map",
        tileId: "a",
        // @ts-expect-error Deliberately bypass square rotation typing to verify runtime admission.
        at: { col: 10, row: 0, rotation: 4 },
      }),
    );
    table.zones.bag.table.push("a");
    atomic(table, () => place("a", "map", 10), "membership");
  });
  test("same-board moves carry cell occupants and attached contents; removal and relocation reject them", () => {
    for (const attached of [false, true]) {
      const { table, place } = fixture();
      place();
      if (attached)
        moveComponentToZoneInPlace({
          table,
          definitions: manifest,
          componentId: "card",
          to: { zoneId: "cell", hostId: tileSpaceId("a", "land") },
        });
      else
        table.componentLocations.card = {
          type: "OnSpace",
          boardId: "map",
          spaceId: tileSpaceId("a", "land"),
          position: 0,
        };
      const occupant = structuredClone(table.componentLocations.card);
      place("a", "map", 5);
      expect(table.componentLocations.card).toEqual(occupant);
      atomic(table, () => place("a", "other", 0));
      atomic(table, () =>
        removeTileInPlace({
          table,
          definitions: manifest,
          tileId: "a",
          boardId: "map",
        }),
      );
      atomic(table, () => moveComponentToDetachedInPlace(table, "a", manifest));
      moveComponentToDetachedInPlace(table, "card", manifest);
      moveComponentToZoneInPlace({
        table,
        definitions: manifest,
        componentId: "a",
        to: { zoneId: "bag", hostId: "table" },
      });
      assertZoneConsistency(table, manifest);
    }
  });
  test("occupied old world edges and vertices block movement even if they remain geometrically present", () => {
    for (const kind of ["edge", "vertex"] as const) {
      const { table, place } = fixture();
      place();
      const board = deriveBoardTopology(table, manifest, "map");
      if (board.layout === "generic") throw new Error("Expected square");
      table.componentLocations.card =
        kind === "edge"
          ? {
              type: "OnEdge",
              boardId: "map",
              edgeId: board.edges[0].id,
              position: 0,
            }
          : {
              type: "OnVertex",
              boardId: "map",
              vertexId: board.vertices[0].id,
              position: 0,
            };
      const before = structuredClone(table);
      place();
      expect(table).toEqual(before);
      atomic(table, () => place("a", "map", 10), "world-element occupant");
      atomic(table, () => place("a", "other", 10), "world-element occupant");
      atomic(table, () =>
        removeTileInPlace({
          table,
          definitions: manifest,
          boardId: "map",
          tileId: "a",
        }),
      );
    }
  });
  test("same-board relations follow stable spaces; cross-board/removal require explicit cleanup", () => {
    const { table, place } = fixture();
    place();
    place("b", "map", 5);
    table.boards.map.relations = [
      {
        id: "bridge",
        typeId: "bridge",
        fromSpaceId: tileSpaceId("a", "land"),
        toSpaceId: tileSpaceId("b", "land"),
        directed: false,
        fields: {},
      },
    ];
    place("a", "map", 10);
    atomic(table, () => place("a", "other"), "incident relations");
    atomic(
      table,
      () =>
        removeTileInPlace({
          table,
          definitions: manifest,
          tileId: "a",
          boardId: "map",
        }),
      "incident relations",
    );
    table.boards.map.relations = [];
    place("a", "other");
    assertZoneConsistency(table, manifest);
    atomic(
      table,
      () =>
        removeTileInPlace({
          table,
          definitions: manifest,
          tileId: "a",
          boardId: "map",
        }),
      "not placed",
    );
  });
});

test("multi-cell hex placements admit all six rotations and transformed coordinate bounds atomically", () => {
  const hex = compileManifest({
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "hex",
        name: "Hex",
        layout: "hex",
        orientation: "pointy",
        scope: "shared",
      },
    ],
    tileTypes: [
      {
        id: "triangle",
        name: "Triangle",
        layout: "hex",
        cells: [
          { id: "a", at: { q: 0, r: 0 } },
          { id: "b", at: { q: 1, r: 0 } },
          { id: "c", at: { q: 0, r: 1 } },
        ],
      },
    ],
    tileSeeds: [{ id: "triangle", typeId: "triangle" }],
  });
  const table: RuntimeTableRecord = hex.createInitialTable({
    playerIds: ["alice"],
  });
  for (const rotation of [0, 1, 2, 3, 4, 5] as const) {
    placeTileInPlace({
      table,
      definitions: hex,
      boardId: "hex",
      tileId: "triangle",
      at: { q: 3, r: -2, rotation },
    });
    const board = deriveBoardTopology(table, hex, "hex");
    expect(Object.keys(board.spaces)).toHaveLength(3);
    assertZoneConsistency(table, hex);
  }
  atomic(
    table,
    () =>
      placeTileInPlace({
        table,
        definitions: hex,
        boardId: "hex",
        tileId: "triangle",
        at: { q: MAXIMUM_BOARD_COORDINATE, r: 0, rotation: 0 },
      }),
    "coordinate",
  );
});

test("incompatible public appearance rejects placement before inventory mutation", () => {
  const { table, place } = fixture();
  table.tiles.a.disclosure = {
    face: { audience: "none" },
    appearance: { layout: "hex", cells: [{ q: 0, r: 0 }] },
  };
  atomic(table, () => place(), "public appearance");
});

test("seeded twelve-triangle setup covers exactly the 37-cell radius-three hexagon", () => {
  const ids = Array.from({ length: 12 }, (_, index) => `tri-${index}`);
  const setup = compileManifest({
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "map",
        name: "Map",
        layout: "hex",
        scope: "shared",
        orientation: "pointy",
      },
    ],
    tileTypes: [
      {
        id: "centre",
        name: "Centre",
        layout: "hex",
        cells: [{ id: "a", at: { q: 0, r: 0 } }],
      },
      {
        id: "triangle",
        name: "Triangle",
        layout: "hex",
        cells: [
          { id: "a", at: { q: 0, r: 0 } },
          { id: "b", at: { q: 1, r: 0 } },
          { id: "c", at: { q: 0, r: 1 } },
        ],
      },
    ],
    tileSeeds: [
      {
        id: "centre",
        typeId: "centre",
        home: {
          type: "board",
          boardId: "map",
          layout: "hex",
          q: 0,
          r: 0,
          rotation: 0,
        },
      },
      ...ids.map((id) => ({ id, typeId: "triangle" as const })),
    ],
  });
  const down = [
    [1, -3],
    [-1, -1],
    [1, -1],
    [-3, 1],
    [-1, 1],
    [1, 1],
  ] as const;
  const up = [
    [0, -3],
    [3, -3],
    [-2, -1],
    [3, -1],
    [-2, 2],
    [0, 2],
  ] as const;
  const slots = [
    ...down.map(([q, r]) => ({
      turn: 0,
      cells: [
        { q, r },
        { q: q + 1, r },
        { q, r: r + 1 },
      ],
    })),
    ...up.map(([q, r]) => ({
      turn: 1,
      cells: [
        { q, r },
        { q, r: r + 1 },
        { q: q - 1, r: r + 1 },
      ],
    })),
  ];
  const build = (seed: number) => {
    const table: RuntimeTableRecord = setup.createInitialTable({
      playerIds: ["alice"],
    });
    let rng: RuntimeRngState = { seed, cursor: 0, trace: [], draws: [] };
    const choose = (bound: number) => {
      const [value, next] = nextRandomInt(bound, rng);
      rng = next;
      return value;
    };
    const order = [...ids];
    for (let index = order.length - 1; index > 0; index--) {
      const other = choose(index + 1);
      [order[index], order[other]] = [order[other], order[index]];
    }
    slots.forEach((slot, index) => {
      const k = choose(3);
      const rotation = slot.turn + 2 * k;
      // Runtime setup values are admitted by the same placement schema as every transaction.
      const placement = TilePlacementSchema.parse({
        type: "OnBoard",
        layout: "hex",
        boardId: "map",
        ...slot.cells[k],
        rotation,
      });
      if (placement.layout !== "hex") throw new Error("Expected hex placement");
      placeTileInPlace({
        table,
        definitions: setup,
        boardId: "map",
        tileId: order[index],
        at: { q: placement.q, r: placement.r, rotation: placement.rotation },
      });
    });
    const board = deriveBoardTopology(table, setup, "map");
    if (board.layout !== "hex") throw new Error("Expected hex topology");
    const cells = Object.values(board.spaces);
    expect(cells).toHaveLength(37);
    expect(new Set(cells.map(({ q, r }) => `${q},${r}`)).size).toBe(37);
    expect(
      cells.every(
        ({ q, r }) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= 3,
      ),
    ).toBe(true);
    for (const id of ids) {
      const triangle = cells.filter((cell) => cell.tileId === id);
      expect(triangle).toHaveLength(3);
      expect(
        triangle.every((a) =>
          triangle.every(
            (b) =>
              Math.max(
                Math.abs(a.q - b.q),
                Math.abs(a.r - b.r),
                Math.abs(a.q + a.r - b.q - b.r),
              ) <= 1,
          ),
        ),
      ).toBe(true);
    }
    expect(rng.cursor).toBe(23);
    assertZoneConsistency(table, setup);
    return { table, rng };
  };
  for (const seed of [1, 2, 3, 4, 5, 17, 91, 1024, 9999, 0x7fffffff])
    expect(build(seed)).toEqual(build(seed));
});

test("rejects overflow in the independently public footprint before removing inventory", () => {
  const { table } = fixture();
  table.tiles.a.disclosure = {
    face: { audience: "none" },
    appearance: { layout: "square", cells: [{ col: 2, row: 0 }] },
  };
  atomic(
    table,
    () =>
      placeTileInPlace({
        table,
        definitions: manifest,
        tileId: "a",
        boardId: "map",
        at: { col: MAXIMUM_BOARD_COORDINATE - 1, row: 0, rotation: 0 },
      }),
    "coordinate domain",
  );
});
