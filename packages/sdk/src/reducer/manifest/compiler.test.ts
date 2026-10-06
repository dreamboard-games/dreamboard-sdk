import { RuntimeJsonSchema } from "../../shared/runtime-json";
import { ReducerSessionStateSchema } from "../../shared/runtime-schema.js";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { compileManifest } from "./compiler";
import { createGame } from "../authoring/game";
import { createTableQueries } from "../table-queries";
import { cloneRuntimeTable } from "../table/clone";
import { asPlayerId } from "../per-player";
import { createReducerTestingRuntime } from "../../testing/reducer-runtime.js";
import { createIngressRuntimeCodec } from "../ingress/runtime-codec";

const manifest = {
  players: { minPlayers: 2, maxPlayers: 4 },
  cardSets: [
    {
      id: "cards",
      name: "Cards",
      defaultHome: { type: "zone", zoneId: "draw" },
      cardSchema: z.object({
        points: z.number().int().default(0),
        color: z.enum(["red", "blue"]),
      }),
      cards: [
        {
          id: "ace",
          cardType: "ace",
          name: "Ace",
          count: 2,
          properties: { color: "red" },
        },
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
  test("treats playing-card names as ordinary authored inventory", () => {
    const compiled = compileManifest({
      ...manifest,
      cardSets: [
        {
          id: "standard_52_deck",
          name: "Authored playing cards",
          defaultHome: { type: "zone", zoneId: "draw" },
          cardSchema: z.object({
            suit: z.enum(["SPADES", "HEARTS"]),
            rank: z.string(),
          }),
          cards: [
            {
              id: "SPADES_A",
              cardType: "SPADES_A",
              name: "Ace of spades",
              count: 1,
              properties: { suit: "SPADES", rank: "A" },
            },
            {
              id: "HEARTS_Q",
              cardType: "HEARTS_Q",
              name: "Queen of hearts",
              count: 1,
              properties: { suit: "HEARTS", rank: "Q" },
            },
          ],
        },
      ],
      zones: [
        {
          id: "draw",
          name: "Draw",
          scope: "shared",
          allowedCardSetIds: ["standard_52_deck"],
        },
      ],
    });
    const table = compiled.createInitialTable();
    expect(Object.keys(table.cards).sort()).toEqual(["HEARTS_Q", "SPADES_A"]);
    expect(table.cards.SPADES_A).toMatchObject({
      id: "SPADES_A",
      cardSetId: "standard_52_deck",
      cardType: "SPADES_A",
      properties: { suit: "SPADES", rank: "A" },
    });
    expect(compiled.ids.cardId.safeParse("CLUBS_2").success).toBe(false);
  });

  test("uses an authored card category distinct from its instance type", () => {
    const compiled = compileManifest({
      ...manifest,
      cardSets: [
        {
          ...manifest.cardSets[0],
          cardSchema: {
            byCardType: {
              "ranked-card": z
                .object({ cost: z.number().int().default(2) })
                .extend({
                  color: z.enum(["red"]),
                  points: z.number().int().default(0),
                }),
            },
          },
          cards: [
            {
              id: "ace",
              cardType: "ranked-card",
              name: "Ace",
              count: 2,
              properties: { color: "red" },
            },
            {
              id: "king",
              cardType: "ranked-card",
              name: "King",
              count: 1,
              properties: { color: "red" },
            },
          ],
        },
      ],
    } as const);
    expect(compiled.createInitialTable().cards["ace-1"].cardType).toBe(
      "ranked-card",
    );
    expect(compiled.createInitialTable().cards["ace-1"].properties).toEqual({
      color: "red",
      points: 0,
      cost: 2,
    });
    expect(Object.keys(compiled.createInitialTable().cards)).toEqual([
      "ace-1",
      "ace-2",
      "king",
    ]);
    expect(compiled.createInitialTable().cards.king.cardType).toBe(
      "ranked-card",
    );
    expect(compiled.literals.cardTypes).toEqual(["ranked-card"]);
    expect(compiled.literals.cardTypeByCardId["ace-1"]).toBe("ranked-card");
    expect(compiled.literals.cardTypeByCardId.king).toBe("ranked-card");
    expect(compiled.records).not.toHaveProperty("playerIds");
  });
  test("keeps each card definition's category and variant fields in the runtime table schema", () => {
    const compiled = compileManifest({
      players: { minPlayers: 1, maxPlayers: 2 },
      cardSets: [
        {
          id: "actions",
          name: "Actions",
          defaultHome: { type: "detached" },
          cardSchema: {
            byCardType: {
              attack: z
                .object({
                  value: z.string().default("shared"),
                  status: z.string().nullable().optional(),
                })
                .extend({
                  value: z.number().int().default(3),
                  damage: z.number().int().default(2),
                  status: z.number().int().nullable().default(5),
                }),
              defense: z
                .object({
                  value: z.string().default("shared"),
                  status: z.string().nullable().optional(),
                })
                .extend({ shield: z.boolean().default(true) }),
            },
          },
          cards: [
            {
              id: "strike",
              cardType: "attack",
              name: "Strike",
              count: 2,
              properties: {},
            },
            {
              id: "block",
              cardType: "defense",
              name: "Block",
              count: 1,
              properties: {},
            },
          ],
        },
        {
          id: "spells",
          name: "Spells",
          defaultHome: { type: "detached" },
          cardSchema: {
            byCardType: {
              attack: z.object({ mana: z.number().int().default(4) }),
            },
          },
          cards: [
            {
              id: "spark",
              cardType: "attack",
              name: "Spark",
              count: 1,
              properties: {},
            },
          ],
        },
      ],
      zones: [],
      boards: [],
    } as const);
    const table = compiled.createInitialTable();
    expect(table.cards["strike-1"]).toMatchObject({
      id: "strike-1",
      cardSetId: "actions",
      cardType: "attack",
      properties: { value: 3, damage: 2, status: 5 },
    });
    expect(table.cards.block).toMatchObject({
      cardSetId: "actions",
      cardType: "defense",
      properties: { value: "shared", shield: true },
    });
    expect(table.cards.spark).toMatchObject({
      cardSetId: "spells",
      cardType: "attack",
      properties: { mana: 4 },
    });
    expect(compiled.tableSchema.safeParse(table).success).toBe(true);
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        cards: {
          ...table.cards,
          "strike-1": {
            ...table.cards["strike-1"],
            properties: {
              ...table.cards["strike-1"].properties,
              status: null,
            },
          },
        },
      }).success,
    ).toBe(true);
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        cards: {
          ...table.cards,
          "strike-1": {
            ...table.cards["strike-1"],
            properties: { value: "shared", damage: 2, status: 5 },
          },
        },
      }).success,
    ).toBe(false);
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        cards: {
          ...table.cards,
          "strike-1": {
            ...table.cards["strike-1"],
            properties: { value: 3, damage: 2, status: "old" },
          },
        },
      }).success,
    ).toBe(false);
  });
  test.each([
    { shared: z.object({}) },
    { shared: z.object({ points: z.number().int() }) },
  ])("rejects an unknown card category with shared schema %#", ({ shared }) => {
    const invalidManifest = {
      ...manifest,
      cardSets: [
        {
          ...manifest.cardSets[0],
          cardSchema: {
            byCardType: { ranked: shared.extend({ rank: z.number().int() }) },
          },
          cards: [
            {
              id: "ace",
              cardType: "missing",
              name: "Ace",
              count: 1,
              properties: {},
            },
          ],
        },
      ],
    } as const;
    const error =
      "manifest.cardSets[0].cards[0].cardType: Unknown card category 'missing' for card set 'cards'.";
    // @ts-expect-error Deliberately invalid correlated authoring data exercises runtime rejection.
    expect(() => compileManifest(invalidManifest)).toThrow(error);
    expect(() =>
      createGame({
        // @ts-expect-error Deliberately invalid correlated authoring data exercises runtime rejection.
        manifest: invalidManifest,
        state: {
          public: z.object({}),
          private: z.object({}),
          hidden: z.object({}),
        },
        phases: { play: z.object({}) },
      }),
    ).toThrow(error);
  });
  test.each([
    {
      card: { type: "ace", name: "Ace", count: 1, properties: {} },
      error:
        /manifest\.cardSets(?:\[0\]|\.0)\.cards(?:\[0\]|\.0)\.id: .*string/,
    },
    {
      card: { id: "ace", name: "Ace", count: 1, properties: {} },
      error:
        /manifest\.cardSets(?:\[0\]|\.0)\.cards(?:\[0\]|\.0)\.cardType: .*string/,
    },
  ])("rejects missing authored card identity fields %#", ({ card, error }) => {
    const invalidManifest: typeof manifest = {
      ...manifest,
      cardSets: [
        {
          ...manifest.cardSets[0],
          // @ts-expect-error Deliberately omit required identity fields to exercise runtime authoring validation.
          cards: [card],
        },
      ],
    };
    expect(() => compileManifest(invalidManifest)).toThrow(error);
    expect(() =>
      createGame({
        manifest: invalidManifest,
        state: {
          public: z.object({}),
          private: z.object({}),
          hidden: z.object({}),
        },
        phases: { play: z.object({}) },
      }),
    ).toThrow(error);
  });
  test("materializes fresh defaults for the active roster and preserves card field schemas", () => {
    const compiled = compileManifest(manifest);
    const table = compiled.createInitialTable({
      playerIds: ["north", "south"],
    });
    expect(table.zones.draw.table).toEqual(["ace-1", "ace-2"]);
    expect(table).toEqual(JSON.parse(JSON.stringify(table)));
    expect(table.cards["ace-1"].properties).toEqual({
      points: 0,
      color: "red",
    });
    expect(Object.keys(table.zones.hand)).toEqual(["north", "south"]);
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
    table.zones.draw.table.pop();
    expect(compiled.createInitialTable().zones.draw.table).toHaveLength(2);
  });
  test("runs authoring validation during compilation", () => {
    // @ts-expect-error The declared default home is deliberately missing its zone.
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
    const bundle = createReducerTestingRuntime(definition);
    const { hand: omittedHand, ...sharedZones } = table.zones;
    void omittedHand;
    const initialized = (
      await bundle.initialize({
        table: RuntimeJsonSchema.parse({
          ...table,

          zones: sharedZones,
          resources: {},
        }),
        playerIds,
        rngSeed: 7,
      })
    ).state;
    const codec = createIngressRuntimeCodec(definition);
    const restored = codec.parseState(
      ReducerSessionStateSchema.parse(JSON.parse(JSON.stringify(initialized))),
    );
    expect(restored.domain.table.playerOrder).toEqual(playerIds);
    expect(restored.domain.table.zones.hand).toEqual({
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
        state: ReducerSessionStateSchema.parse(
          JSON.parse(JSON.stringify(initialized)),
        ),
        playerIds,
      }),
    ).not.toThrow();
  });

  test("projects owner-only resources to their holder and card images with cards", async () => {
    const game = createGame({
      manifest: {
        ...manifest,
        cardSets: [
          {
            ...manifest.cardSets[0],
            cards: [
              {
                ...manifest.cardSets[0].cards[0],
                frontImage: "assets/cards/ace.webp",
                backImage: "assets/cards/back.webp",
              },
            ],
          },
        ],
        zones: [{ ...manifest.zones[0], visibility: "public" }],
        resources: [
          { id: "points", name: "Points" },
          { id: "secret", name: "Secret", visibility: "owner" },
        ],
      },
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
    const playerIds = ["alpha", "zulu"];
    const bundle = createReducerTestingRuntime(definition);
    const { state } = await bundle.initialize({
      table: RuntimeJsonSchema.parse(
        game.contract.manifest.createInitialTable({ playerIds }),
      ),
      playerIds,
      rngSeed: 7,
    });
    const table = game.contract.manifest.tableSchema.parse(state.domain.table);
    expect(table.cards["ace-1"]).toMatchObject({
      frontImage: "assets/cards/ace.webp",
      backImage: "assets/cards/back.webp",
    });
    const { seats } = bundle.project({ state, playerIds });
    expect(seats.alpha?.resources).toEqual({
      alpha: { points: 0, secret: 0 },
      zulu: { points: 0 },
    });
    expect(seats.zulu?.resources).toEqual({
      alpha: { points: 0 },
      zulu: { points: 0, secret: 0 },
    });
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
    const q = createTableQueries(restored, compiled);
    expect(q.player.order()).toEqual(["10", "2"]);
    expect(q.player.nextInOrder(restored.playerOrder[0])).toBe("2");
    expect(restored.zones.hand).toEqual({ "10": [], "2": [] });
    expect(restored.resources).toEqual({
      "10": { points: 0 },
      "2": { points: 0 },
    });
    const clone = cloneRuntimeTable(restored);
    clone.zones.hand[restored.playerOrder[0]].push("ace-1");
    clone.zones.hand[asPlayerId("10")].push("ace-2");
    clone.resources[restored.playerOrder[0]].points = 8;
    expect(restored.zones.hand[restored.playerOrder[0]]).toEqual([]);
    expect(restored.resources[restored.playerOrder[0]].points).toBe(0);
  });

  test("rejects missing or foreign active players and old wrappers at the manifest boundary", () => {
    const compiled = compileManifest(manifest);
    const table = compiled.createInitialTable({ playerIds: ["zulu", "alpha"] });
    for (const field of ["zones", "resources"] as const) {
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
            : { ...table, zones: { ...table.zones, hand: record } };
        expect(compiled.tableSchema.safeParse(candidate).success).toBe(false);
      }
    }
    for (const mirror of ["hands", "decks"]) {
      expect(
        compiled.tableSchema.safeParse({ ...table, [mirror]: {} }).success,
      ).toBe(false);
    }
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        playerOrder: ["zulu", "zulu"],
      }).success,
    ).toBe(false);
  });
});
