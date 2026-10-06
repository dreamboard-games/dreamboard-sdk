import { compileManifest } from "./manifest/compiler";
import { RuntimeJsonSchema } from "../shared/runtime-json";
import { ReducerSessionStateSchema } from "../shared/runtime-schema";
import { createGame as createModel } from "../reducer";
import {
  createReducerTransaction,
  type ReducerTransaction,
} from "./transaction";
import {
  createTestRandom,
  createTestTransaction,
} from "./transaction-test-fixtures";

import { createReducerTestingRuntime } from "../testing/reducer-runtime.js";
import { describe, expect, test } from "vitest";
import { z } from "zod";

import {
  type BaseGameStateOfContract,
  type RuntimeTableRecord,
  type RuntimeRecord,
} from "../reducer/model";
import { asPlayerId } from "./per-player";

function pp<T>(
  playerIds: readonly string[],
  source: Readonly<Record<string, T>>,
  fallback: T,
) {
  return Object.fromEntries(
    playerIds.map((id) => [
      id,
      Object.prototype.hasOwnProperty.call(source, id) ? source[id] : fallback,
    ]),
  );
}

function ppEmpty(playerIds: readonly string[]): Record<string, RuntimeRecord> {
  return Object.fromEntries(playerIds.map((id) => [id, {}]));
}

function createEmptyTable(
  playerIds = ["player-1", "player-2"],
): RuntimeTableRecord {
  return {
    playerOrder: [...playerIds],
    zones: {
      shared: {},
      perPlayer: {},
      visibility: {},
    },
    decks: {},
    hands: {},
    handVisibility: {},
    cards: {},
    pieces: {},
    componentLocations: {},
    ownerOfCard: {},
    visibility: {},
    resources: {},
    boards: {
      byId: {},
      hex: {},
      network: {},
      square: {},
      track: {},
    },
    dice: {},
  };
}

function createManifestContract() {
  return compileManifest({
    players: { minPlayers: 2, maxPlayers: 4 },
    cardSets: [],
    zones: [
      {
        id: "hand",
        name: "Hand",
        scope: "perPlayer",
        allowedCardSetIds: [],
        visibility: "ownerOnly",
      },
    ],
    resources: [{ id: "coins", name: "Coins" }],
  });
}

const BOOTSTRAP_PLAYER_IDS = ["player-1", "player-2"] as const;
const BOOTSTRAP_CARD_IDS = ["card-1", "card-2", "card-3", "card-4"] as const;

function createBootstrapManifestContract() {
  return compileManifest({
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [
      {
        id: "main",
        name: "Main",
        defaultHome: { type: "zone", zoneId: "draw-deck" },
        cardSchema: z.object({}),
        cards: BOOTSTRAP_CARD_IDS.map((id) => ({
          id,
          name: id,
          cardType: "card",
          count: 1,
          properties: {},
        })),
      },
    ],
    zones: [
      {
        id: "draw-deck",
        name: "Draw",
        scope: "shared",
        allowedCardSetIds: ["main"],
        visibility: "public",
      },
      {
        id: "hand",
        name: "Hand",
        scope: "perPlayer",
        allowedCardSetIds: ["main"],
        visibility: "ownerOnly",
      },
    ],
  });
}

function createBootstrapTable() {
  return createBootstrapManifestContract().createInitialTable({
    playerIds: [...BOOTSTRAP_PLAYER_IDS],
  });
}

function createBootstrapModel() {
  return createModel({
    manifest: createBootstrapManifestContract(),
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: { setup: z.object({}) },
  });
}

function createBootstrapGame(
  initialize: (
    tx: ReducerTransaction<
      BaseGameStateOfContract<
        ReturnType<typeof createBootstrapModel>["contract"]
      >
    >,
  ) => void,
) {
  const contract = createBootstrapModel();

  return contract.assemble({
    initialPhase: "setup",
    phases: {
      setup: contract.phase("setup").define({
        kind: "auto",
        initialState: () => ({}),
        enter: ({ tx }) => initialize(tx),
      }),
    },
    view: () => ({}),
  });
}

describe("initialization runtime", () => {
  test("parsed options reach initial state and each phase initializer and survive restoration", async () => {
    const contract = createModel({
      manifest: createManifestContract(),
      options: z.strictObject({
        mode: z.enum(["draft", "quick"]),
        rounds: z.number().int().positive().default(3),
      }),
      phases: {
        defaultPhase: z.object({ mode: z.string() }),
        draftPhase: z.object({ mode: z.string() }),
      },
      state: {
        public: z.object({ mode: z.string() }),
        private: z.object({ rounds: z.number() }),
        hidden: z.object({ mode: z.string() }),
      },
    });
    const game = contract.assemble({
      initial: {
        public: ({ options }) => ({ mode: options.mode }),
        private: ({ options }) => ({ rounds: options.rounds }),
        hidden: ({ options }) => ({ mode: options.mode }),
      },
      initialPhase: "defaultPhase",
      phases: {
        defaultPhase: contract.phase("defaultPhase").define({
          kind: "auto",
          initialState: ({ options }) => ({ mode: options.mode }),
          enter: ({ tx }) => tx.transition("draftPhase"),
        }),
        draftPhase: contract.phase("draftPhase").define({
          kind: "player",
          initialState: ({ options }) => ({ mode: options.mode }),
          interactions: {
            next: contract.phase("draftPhase").interaction({
              inputs: {},
              reduce: ({ tx }) => tx.transition("draftPhase"),
            }),
          },
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingRuntime(game);
    const request = {
      table: RuntimeJsonSchema.parse(createEmptyTable()),
      playerIds: ["player-1", "player-2"],
      rngSeed: 42,
      options: { mode: "draft" },
    };
    const initialized = (await bundle.initialize(request)).state;
    expect(initialized.runtime.options).toEqual({ mode: "draft", rounds: 3 });
    expect(initialized.domain.publicState).toEqual({ mode: "draft" });
    expect(initialized.domain.hiddenState).toEqual({ mode: "draft" });
    expect(initialized.domain.privateState).toEqual({
      "player-1": { rounds: 3 },
      "player-2": { rounds: 3 },
    });
    expect(initialized.domain.phase).toEqual({ mode: "draft" });
    const restored = ReducerSessionStateSchema.parse(
      JSON.parse(JSON.stringify(initialized)),
    );
    const next = await bundle.reduce({
      state: restored,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "next",
        params: {},
      },
    });
    expect(next.kind).toBe("accept");
    if (next.kind !== "accept") throw new Error("Expected acceptance");
    expect(next.state.runtime.options).toEqual(initialized.runtime.options);
    expect(next.state.domain.phase).toEqual({ mode: "draft" });
    for (const options of [
      { mode: "invalid" },
      { mode: "draft", rounds: "3" },
      { mode: "draft", extra: true },
      null,
      { mode: "draft", rounds: Infinity },
    ]) {
      const invalidInitialization: unknown = Reflect.apply(
        bundle.initialize,
        bundle,
        [{ ...request, options }],
      );
      await expect(invalidInitialization).rejects.toThrow();
      expect(() => {
        Reflect.apply(bundle.project, bundle, [
          {
            state: { ...restored, runtime: { ...restored.runtime, options } },
            playerIds: ["player-1"],
          },
        ]);
      }).toThrow();
    }
  });

  test("options schemas reject transforms, preprocess, and nested lazy coercion", () => {
    for (const options of [
      z.object({ count: z.number().transform((n) => n + 1) }),
      z.object({ count: z.number().overwrite((n) => n + 1) }),
      z.preprocess((value) => value, z.object({ count: z.number() })),
      z.object({
        nested: z.lazy(() => z.object({ count: z.coerce.number() })),
      }),
      z.object({ date: z.date() }),
    ]) {
      expect(() => {
        Reflect.apply(createModel, undefined, [
          {
            manifest: createManifestContract(),
            options,
            phases: { defaultPhase: z.object({}) },
            state: {
              public: z.object({}),
              private: z.object({}),
              hidden: z.object({}),
            },
          },
        ]);
      }).toThrow();
    }
  });

  test("initialize only materializes the actual session players for per-player hands and resources", async () => {
    const contract = createModel({
      manifest: createManifestContract(),
      phases: { defaultPhase: z.object({}), draftPhase: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });

    const game = contract.assemble({
      initialPhase: "defaultPhase",
      phases: {
        defaultPhase: contract
          .phase("defaultPhase")
          .define({ kind: "auto", initialState: () => ({}) }),
        draftPhase: contract
          .phase("draftPhase")
          .define({ kind: "auto", initialState: () => ({}) }),
      },
      view: () => ({}),
    });

    const bundle = createReducerTestingRuntime(game);
    const initialized = (
      await bundle.initialize({
        table: RuntimeJsonSchema.parse(
          createEmptyTable(["player-1", "player-2"]),
        ),
        playerIds: ["player-1", "player-2"],
        rngSeed: 7,
      })
    ).state;
    const table = game.contract.manifest.tableSchema.parse(
      initialized.domain.table,
    );

    expect(Object.keys(table.hands.hand)).toEqual(["player-1", "player-2"]);
    expect(Object.keys(table.resources)).toEqual(["player-1", "player-2"]);
    expect(table.resources[asPlayerId("player-1")]).toEqual({
      coins: 0,
    });
    expect(table.resources[asPlayerId("player-3")]).toBeUndefined();
  });

  test("initialize preserves explicit deck, hand, and component location state", async () => {
    const contract = createModel({
      manifest: compileManifest({
        players: { minPlayers: 2, maxPlayers: 2 },
        cardSets: [
          {
            id: "main",
            name: "Main",
            defaultHome: { type: "zone", zoneId: "draw-deck" },
            cardSchema: z.object({}),
            cards: [
              {
                id: "card-1",
                name: "Card 1",
                cardType: "thing",
                count: 1,
                properties: {},
              },
              {
                id: "card-2",
                name: "Card 2",
                cardType: "thing",
                count: 1,
                properties: {},
              },
            ],
          },
        ],
        zones: [
          {
            id: "draw-deck",
            name: "Draw",
            scope: "shared",
            allowedCardSetIds: ["main"],
            visibility: "public",
          },
          {
            id: "hand",
            name: "Hand",
            scope: "perPlayer",
            allowedCardSetIds: ["main"],
            visibility: "ownerOnly",
          },
        ],
      }),
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
      phases: {
        defaultPhase: z.object({}),
      },
    });

    const game = contract.assemble({
      initialPhase: "defaultPhase",
      phases: {
        defaultPhase: contract
          .phase("defaultPhase")
          .define({ kind: "auto", initialState: () => ({}) }),
      },
      view: () => ({}),
    });

    const bundle = createReducerTestingRuntime(game);
    const initialized = (
      await bundle.initialize({
        table: {
          playerOrder: ["player-1", "player-2"],
          zones: {
            shared: {
              "draw-deck": ["card-1"],
            },
            perPlayer: {
              hand: pp<string[]>(
                ["player-1", "player-2"],
                { "player-2": ["card-2"] },
                [],
              ),
            },
            visibility: {
              "draw-deck": "public",
              hand: "ownerOnly",
            },
            cardSetIdsByZoneId: {
              "draw-deck": ["main"],
              hand: ["main"],
            },
          },
          decks: {
            "draw-deck": ["card-1"],
          },
          hands: {
            hand: pp<string[]>(
              ["player-1", "player-2"],
              { "player-2": ["card-2"] },
              [],
            ),
          },
          handVisibility: {
            hand: "ownerOnly",
          },
          cards: {
            "card-1": {
              id: "card-1",
              cardSetId: "main",
              cardType: "thing",
              properties: {},
            },
            "card-2": {
              id: "card-2",
              cardSetId: "main",
              cardType: "thing",
              properties: {},
            },
          },
          pieces: {},
          componentLocations: {
            "card-1": {
              type: "InDeck",
              deckId: "draw-deck",
              playedBy: null,
              position: 0,
            },
            "card-2": {
              type: "InHand",
              handId: "hand",
              playerId: "player-2",
              position: 0,
            },
          },
          ownerOfCard: {},
          visibility: {},
          resources: ppEmpty(["player-1", "player-2"]),
          boards: {
            byId: {},
            hex: {},
            network: {},
            square: {},
            track: {},
          },
          dice: {},
        },
        playerIds: ["player-1", "player-2"],
      })
    ).state;
    const table = game.contract.manifest.tableSchema.parse(
      initialized.domain.table,
    );

    expect(table.playerOrder).toEqual(["player-1", "player-2"]);
    expect(table.decks["draw-deck"]).toEqual(["card-1"]);
    expect(table.hands.hand[asPlayerId("player-1")]).toEqual([]);
    expect(table.hands.hand[asPlayerId("player-2")]).toEqual(["card-2"]);
    expect(table.componentLocations["card-1"]).toEqual({
      type: "InDeck",
      deckId: "draw-deck",
      playedBy: null,
      position: 0,
    });
    expect(table.componentLocations["card-2"]).toEqual({
      type: "InHand",
      handId: "hand",
      playerId: "player-2",
      position: 0,
    });
  });

  test("games without an options schema reject undeclared lobby options", async () => {
    const bundle = createReducerTestingRuntime(createBootstrapGame(() => {}));
    const request = {
      table: RuntimeJsonSchema.parse(createBootstrapTable()),
      playerIds: [...BOOTSTRAP_PLAYER_IDS],
      rngSeed: 42,
    };
    expect((await bundle.initialize(request)).state.runtime.options).toEqual(
      {},
    );
    await expect(
      bundle.initialize({ ...request, options: { undeclared: true } }),
    ).rejects.toThrow();
  });

  test("phase entry shuffles with seeded entropy", async () => {
    const game = createBootstrapGame((tx) => {
      tx.shuffle({ zoneId: "draw-deck" });
    });
    const bundle = createReducerTestingRuntime(game);

    const initialized = (
      await bundle.initialize({
        table: RuntimeJsonSchema.parse(createBootstrapTable()),
        playerIds: [...BOOTSTRAP_PLAYER_IDS],
        rngSeed: 42,
      })
    ).state;
    const table = game.contract.manifest.tableSchema.parse(
      initialized.domain.table,
    );
    const order = table.zones.shared["draw-deck"];

    expect(order).toHaveLength(BOOTSTRAP_CARD_IDS.length);
    expect([...order].sort()).toEqual([...BOOTSTRAP_CARD_IDS].sort());
    expect(order).not.toEqual([...BOOTSTRAP_CARD_IDS]);
    expect(initialized.runtime.rng.cursor).toBe(3);
    expect(initialized.runtime.rng.trace).toEqual([
      "cursor=0;bound=4;value=0",
      "cursor=1;bound=3;value=1",
      "cursor=2;bound=2;value=0",
    ]);
  });

  test("phase entry deals to each seat", async () => {
    const game = createBootstrapGame((tx) => {
      for (const playerId of tx.q.player.order())
        tx.deal({
          fromZoneId: "draw-deck",
          toZoneId: "hand",
          playerId,
          count: 1,
        });
    });
    const bundle = createReducerTestingRuntime(game);

    const initialized = (
      await bundle.initialize({
        table: RuntimeJsonSchema.parse(createBootstrapTable()),
        playerIds: [...BOOTSTRAP_PLAYER_IDS],
        rngSeed: 42,
      })
    ).state;
    const table = game.contract.manifest.tableSchema.parse(
      initialized.domain.table,
    );

    expect(table.zones.shared["draw-deck"]).toEqual(["card-3", "card-4"]);
    expect(table.hands.hand[asPlayerId("player-1")]).toEqual(["card-1"]);
    expect(table.hands.hand[asPlayerId("player-2")]).toEqual(["card-2"]);
    expect(initialized.runtime.rng.trace).toEqual([]);
  });

  test("transaction initialization shuffles, deals cards, and places components", () => {
    const initialState = {
      table: {
        playerOrder: ["player-1", "player-2"],
        zones: {
          shared: {
            "draw-deck": ["card-1", "card-2", "card-3"],
            supply: ["piece-1", "die-1"],
          },
          perPlayer: {
            hand: pp<string[]>(
              ["player-1", "player-2"],
              { "player-1": [], "player-2": [] },
              [],
            ),
          },
          visibility: {
            "draw-deck": "public",
            supply: "public",
            hand: "ownerOnly",
          },
          cardSetIdsByZoneId: {
            "draw-deck": ["main"],
            hand: ["main"],
          },
        },
        decks: {
          "draw-deck": ["card-1", "card-2", "card-3"],
          supply: ["piece-1", "die-1"],
        },
        hands: {
          hand: pp<string[]>(
            ["player-1", "player-2"],
            { "player-1": [], "player-2": [] },
            [],
          ),
        },
        handVisibility: {
          hand: "ownerOnly",
        },
        cards: {
          "card-1": {
            id: "card-1",
            cardSetId: "main",
            cardType: "CARD",
            properties: {},
          },
          "card-2": {
            id: "card-2",
            cardSetId: "main",
            cardType: "CARD",
            properties: {},
          },
          "card-3": {
            id: "card-3",
            cardSetId: "main",
            cardType: "CARD",
            properties: {},
          },
        },
        pieces: {
          "piece-1": {
            id: "piece-1",
            pieceTypeId: "token",
            properties: {},
          },
        },
        componentLocations: {
          "card-1": {
            type: "InDeck",
            deckId: "draw-deck",
            playedBy: null,
            position: 0,
          },
          "card-2": {
            type: "InDeck",
            deckId: "draw-deck",
            playedBy: null,
            position: 1,
          },
          "card-3": {
            type: "InDeck",
            deckId: "draw-deck",
            playedBy: null,
            position: 2,
          },
          "piece-1": {
            type: "InZone",
            zoneId: "supply",
            playedBy: null,
            position: 0,
          },
          "die-1": {
            type: "InZone",
            zoneId: "supply",
            playedBy: null,
            position: 1,
          },
        },
        ownerOfCard: {},
        visibility: {
          "card-1": { faceUp: true },
          "card-2": { faceUp: true },
          "card-3": { faceUp: true },
        },
        resources: ppEmpty(["player-1", "player-2"]),
        boards: {
          byId: {
            "main-board": {
              id: "main-board",
              layout: "generic",
              typeId: "track",
              scope: "shared",
              fields: {},
              spaces: {
                "space-a": {
                  id: "space-a",
                  typeId: "slot",
                  fields: {},
                  zoneId: null,
                },
              },
              relations: [],
              containers: {},
            },
          },
          hex: {},
          network: {},
          square: {},
          track: {},
        },
        dice: {
          "die-1": {
            id: "die-1",
            dieTypeId: "d6",
            sides: 6,
            properties: {},
          },
        },
      } satisfies RuntimeTableRecord,
      runtime: {
        events: [],
        rng: {
          seed: 7,
          cursor: 0,
          trace: [],
          draws: [],
        },
        options: {},
        simultaneous: { current: null },
        lastTransition: null,
      },
    };

    const random = createTestRandom(initialState.runtime.rng.seed);
    const tx = createReducerTransaction(initialState, random);
    tx.shuffle({ zoneId: "draw-deck" });
    for (const playerId of tx.q.player.order())
      tx.deal({
        fromZoneId: "draw-deck",
        toZoneId: "hand",
        playerId,
        count: 1,
      });
    for (const componentId of ["piece-1", "die-1"] as const)
      tx.moveComponentToSpace({
        componentId,
        boardId: "main-board",
        spaceId: "space-a",
      });
    const nextState = {
      ...tx.state,
      runtime: { ...tx.state.runtime, rng: random.currentRng() },
    };

    expect(nextState.runtime.rng.cursor).toBe(2);
    expect(nextState.runtime.rng.trace).toHaveLength(2);
    expect(nextState.table.hands.hand[asPlayerId("player-1")]).toHaveLength(1);
    expect(nextState.table.hands.hand[asPlayerId("player-2")]).toHaveLength(1);
    expect(nextState.table.hands.hand[asPlayerId("player-1")]).not.toEqual(
      nextState.table.hands.hand[asPlayerId("player-2")],
    );
    expect(nextState.table.decks["draw-deck"]).toHaveLength(1);
    expect(nextState.table.zones.shared.supply).toEqual([]);
    expect(nextState.table.componentLocations["piece-1"]).toEqual({
      type: "OnSpace",
      boardId: "main-board",
      spaceId: "space-a",
      position: 0,
    });
    expect(nextState.table.componentLocations["die-1"]).toEqual({
      type: "OnSpace",
      boardId: "main-board",
      spaceId: "space-a",
      position: 1,
    });
  });

  test("transaction initialization rejects incompatible card destinations", () => {
    const initialState = {
      table: {
        playerOrder: ["player-1"],
        zones: {
          shared: {
            "draw-deck": ["card-1"],
          },
          perPlayer: {
            hand: pp<string[]>(["player-1"], { "player-1": [] }, []),
          },
          visibility: {
            "draw-deck": "public",
            hand: "ownerOnly",
          },
          cardSetIdsByZoneId: {
            "draw-deck": ["main"],
            hand: ["special"],
          },
        },
        decks: {
          "draw-deck": ["card-1"],
        },
        hands: {
          hand: pp<string[]>(["player-1"], { "player-1": [] }, []),
        },
        handVisibility: {
          hand: "ownerOnly",
        },
        cards: {
          "card-1": {
            id: "card-1",
            cardSetId: "main",
            cardType: "CARD",
            properties: {},
          },
        },
        pieces: {},
        componentLocations: {
          "card-1": {
            type: "InDeck",
            deckId: "draw-deck",
            playedBy: null,
            position: 0,
          },
        },
        ownerOfCard: {},
        visibility: {
          "card-1": { faceUp: true },
        },
        resources: ppEmpty(["player-1"]),
        boards: {
          byId: {
            "main-board": {
              id: "main-board",
              layout: "generic",
              typeId: "track",
              scope: "shared",
              fields: {},
              spaces: {},
              relations: [],
              containers: {
                "restricted-row": {
                  id: "restricted-row",
                  name: "Restricted Row",
                  host: { type: "board" },
                  allowedCardSetIds: ["special"],
                  zoneId: "main-board::container::restricted-row",
                  fields: {},
                },
              },
            },
          },
          hex: {},
          network: {},
          square: {},
          track: {},
        },
        dice: {},
      } satisfies RuntimeTableRecord,
      runtime: {
        events: [],
        rng: {
          seed: 1,
          cursor: 0,
          trace: [],
          draws: [],
        },
        options: {},
        simultaneous: { current: null },
        lastTransition: null,
      },
    };

    expect(() =>
      createTestTransaction(initialState).deal({
        fromZoneId: "draw-deck",
        toZoneId: "hand",
        playerId: "player-1",
        count: 1,
      }),
    ).toThrow("cannot enter zone 'hand'");
    expect(() =>
      createTestTransaction(initialState).moveComponentToContainer({
        componentId: "card-1",
        boardId: "main-board",
        containerId: "restricted-row",
      }),
    ).toThrow("cannot enter container 'restricted-row'");
  });

  test("initialize injects table queries (q) into initial.public/private/hidden callbacks", async () => {
    const contract = createModel({
      manifest: createManifestContract(),
      phases: { defaultPhase: z.object({}), draftPhase: z.object({}) },
      state: {
        public: z.object({
          publicPlayerOrder: z.array(z.string()),
        }),
        private: z.object({
          privatePlayerOrder: z.array(z.string()),
        }),
        hidden: z.object({
          hiddenPlayerOrder: z.array(z.string()),
        }),
      },
    });

    const publicQ: unknown[] = [];
    const privateQ: unknown[] = [];
    const hiddenQ: unknown[] = [];

    const game = contract.assemble({
      initial: {
        public: ({ q }) => {
          publicQ.push(q);
          return { publicPlayerOrder: [...q.player.order()] };
        },
        private: ({ q }) => {
          privateQ.push(q);
          return { privatePlayerOrder: [...q.player.order()] };
        },
        hidden: ({ q }) => {
          hiddenQ.push(q);
          return { hiddenPlayerOrder: [...q.player.order()] };
        },
      },
      initialPhase: "defaultPhase",
      phases: {
        defaultPhase: contract
          .phase("defaultPhase")
          .define({ kind: "auto", initialState: () => ({}) }),
        draftPhase: contract
          .phase("draftPhase")
          .define({ kind: "auto", initialState: () => ({}) }),
      },
      view: () => ({}),
    });

    const bundle = createReducerTestingRuntime(game);
    const initialized = (
      await bundle.initialize({
        table: RuntimeJsonSchema.parse(
          createEmptyTable(["player-1", "player-2"]),
        ),
        playerIds: ["player-1", "player-2"],
        rngSeed: 1,
      })
    ).state;

    expect(publicQ).toHaveLength(1);
    expect(privateQ).toHaveLength(2);
    expect(hiddenQ).toHaveLength(1);
    expect(initialized.domain.publicState).toEqual({
      publicPlayerOrder: ["player-1", "player-2"],
    });
    expect(initialized.domain.privateState["player-1"]).toEqual({
      privatePlayerOrder: ["player-1", "player-2"],
    });
    expect(initialized.domain.hiddenState).toEqual({
      hiddenPlayerOrder: ["player-1", "player-2"],
    });
  });
});
