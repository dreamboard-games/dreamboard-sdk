import { describe, expect, test } from "vitest";
import { z } from "zod";
import { compileManifest } from "./compiler";
import { createGame } from "../authoring/game";
import { createTableQueries } from "../table-queries";
import { cloneRuntimeTable } from "../table/clone";
import { createReducerTestingBundle } from "../../testing/reducer-runtime.js";
import { createIngressRuntimeCodec } from "../ingress/runtime-codec";

const manifest = {
  players: { minPlayers: 2, maxPlayers: 4 },
  cardSets: [
    {
      type: "manual",
      id: "cards",
      name: "Cards",
      defaultHome: { type: "zone", zoneId: "draw" },
      cardSchema: {
        properties: {
          points: { type: "integer", default: 0 },
          color: { type: "enum", enums: ["red", "blue"] },
        },
      },
      cards: [
        { type: "ace", name: "Ace", count: 2, properties: { color: "red" } },
      ],
    },
  ],
  zones: [
    {
      id: "draw",
      name: "Draw",
      scope: "shared",
      allowedCardSetIds: ["cards"],
      visibility: "hidden",
    },
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      allowedCardSetIds: ["cards"],
      visibility: "ownerOnly",
    },
  ],
  boards: [],
  resources: [{ id: "points", name: "Points" }],
} as const;
describe("in-memory manifests", () => {
  test("materializes fresh defaults for the active roster and preserves card field schemas", () => {
    const compiled = compileManifest(manifest);
    const table = compiled.createInitialTable({
      playerIds: ["north", "south"],
    });
    expect(table.decks.draw).toEqual(["ace-1", "ace-2"]);
    expect(table).toEqual(JSON.parse(JSON.stringify(table)));
    expect(table.cards["ace-1"].properties).toEqual({
      points: 0,
      color: "red",
    });
    expect(Object.keys(table.hands.hand)).toEqual(["north", "south"]);
    expect(compiled.ids.cardId.safeParse("ace-3").success).toBe(false);
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        cards: {
          ...table.cards,
          "ace-1": {
            ...table.cards["ace-1"],
            properties: { points: 1.5, color: "green" },
          },
        },
      }).success,
    ).toBe(false);
    table.decks.draw.pop();
    expect(compiled.createInitialTable().decks.draw).toHaveLength(2);
  });
  test("runs authoring validation during compilation", () => {
    expect(() => compileManifest({ ...manifest, zones: [] })).toThrow(
      /unknown zone 'draw'/,
    );
  });
  test("createGame accepts an ordinary authored manifest value", () => {
    const game = createGame({
      manifest,
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
      phases: { play: z.object({}) },
    });
    expect(game).toHaveProperty("assemble");
  });
});

test("player-scoped boards follow the active roster rather than max-player placeholders", () => {
  const board = compileManifest({
    players: { minPlayers: 1, maxPlayers: 4 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "mat",
        name: "Mat",
        layout: "generic",
        scope: "perPlayer",
        spaces: [],
        relations: [],
        containers: [],
      },
    ],
  } as const);
  const table = board.createInitialTable({ playerIds: ["north", "south"] });
  expect(Object.keys(table.boards.byId)).toEqual(["mat:north", "mat:south"]);
  expect(board.ids.boardId.safeParse("mat:north").success).toBe(true);
  expect(board.ids.boardId.safeParse("other:north").success).toBe(false);
  expect(board.ids.cardId.safeParse("unavailable").success).toBe(false);
});

test("derived geometry IDs remain constrained by the materialized topology", () => {
  const compiled = compileManifest({
    players: { minPlayers: 1, maxPlayers: 2 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "map",
        name: "Map",
        layout: "square",
        scope: "shared",
        spaces: [
          { id: "a", row: 0, col: 0 },
          { id: "b", row: 0, col: 1 },
        ],
        relations: [],
        containers: [],
        edges: [],
        vertices: [],
      },
    ],
  } as const);
  expect(compiled.ids.edgeId.safeParse("square-edge:1,0::1,1").success).toBe(
    true,
  );
  expect(compiled.ids.vertexId.safeParse("square-vertex:1,1").success).toBe(
    true,
  );
  expect(compiled.ids.edgeId.safeParse("square-edge:99,0::99,1").success).toBe(
    false,
  );
  expect(compiled.ids.vertexId.safeParse("square-vertex:99,99").success).toBe(
    false,
  );
});

describe("active player records", () => {
  test("initializes defaults for two of four seats and restores the serialized session", async () => {
    const game = createGame({
      manifest,
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
      phases: { play: z.object({}) },
    });
    const definition = game.assemble({
      initialPhase: "play",
      phases: {
        play: game
          .phase("play")
          .define({ kind: "auto", initialState: () => ({}) }),
      },
      view: () => ({}),
    });
    const playerIds = ["zulu", "alpha"];
    const table = game.contract.manifest.createInitialTable({ playerIds });
    const bundle = createReducerTestingBundle(definition);
    const initialized = await bundle.initialize({
      table: {
        ...table,
        hands: {},
        zones: { ...table.zones, perPlayer: {} },
        resources: {},
      },
      playerIds,
      rngSeed: 7,
    });
    const codec = createIngressRuntimeCodec(definition);
    const restored = codec.parseState(JSON.parse(JSON.stringify(initialized)));
    expect(restored.domain.table.playerOrder).toEqual(playerIds);
    expect(restored.domain.table.hands.hand).toEqual({ zulu: [], alpha: [] });
    expect(restored.domain.table.zones.perPlayer.hand).toEqual({
      zulu: [],
      alpha: [],
    });
    expect(restored.domain.table.resources).toEqual({
      zulu: { points: 0 },
      alpha: { points: 0 },
    });
    expect(codec.serializeState(restored)).toEqual(initialized);
    expect(() =>
      bundle.project({
        state: JSON.parse(JSON.stringify(initialized)),
        playerIds,
      }),
    ).not.toThrow();
  });

  test("roundtrips a partial roster and takes traversal order only from playerOrder", () => {
    const compiled = compileManifest(manifest);
    const table = compiled.createInitialTable({ playerIds: ["10", "2"] });
    const restored = compiled.tableSchema.parse(
      JSON.parse(JSON.stringify(table)),
    );
    expect(restored.playerOrder).toEqual(["10", "2"]);
    // Integer-like record keys have a different JS enumeration order.
    expect(Object.keys(restored.resources)).toEqual(["2", "10"]);
    const q = createTableQueries(restored);
    expect(q.player.order()).toEqual(["10", "2"]);
    expect(q.player.nextInOrder(restored.playerOrder[0]!)).toBe("2");
    expect(restored.hands.hand).toEqual({ "10": [], "2": [] });
    expect(restored.zones.perPlayer.hand).toEqual({ "10": [], "2": [] });
    expect(restored.resources).toEqual({
      "10": { points: 0 },
      "2": { points: 0 },
    });
    const clone = cloneRuntimeTable(restored);
    clone.hands.hand[restored.playerOrder[0]!].push("ace-1");
    clone.zones.perPlayer.hand!["10"].push("ace-2");
    clone.resources[restored.playerOrder[0]!].points = 8;
    expect(restored.hands.hand[restored.playerOrder[0]!]).toEqual([]);
    expect(restored.zones.perPlayer.hand!["10"]).toEqual([]);
    expect(restored.resources[restored.playerOrder[0]!].points).toBe(0);
  });

  test("rejects missing or foreign active players and old wrappers at the manifest boundary", () => {
    const compiled = compileManifest(manifest);
    const table = compiled.createInitialTable({ playerIds: ["zulu", "alpha"] });
    for (const field of ["hands", "zones", "resources"] as const) {
      for (const record of [
        { zulu: field === "resources" ? { points: 0 } : [] },
        {
          zulu: field === "resources" ? { points: 0 } : [],
          alpha: field === "resources" ? { points: 0 } : [],
          outsider: field === "resources" ? { points: 0 } : [],
        },
        {
          __perPlayer: true,
          entries: [
            ["zulu", []],
            ["alpha", []],
          ],
        },
      ]) {
        const candidate =
          field === "resources"
            ? { ...table, resources: record }
            : field === "hands"
              ? { ...table, hands: { hand: record } }
              : {
                  ...table,
                  zones: { ...table.zones, perPlayer: { hand: record } },
                };
        expect(compiled.tableSchema.safeParse(candidate).success).toBe(false);
      }
    }
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        playerOrder: ["zulu", "zulu"],
      }).success,
    ).toBe(false);
  });
});
