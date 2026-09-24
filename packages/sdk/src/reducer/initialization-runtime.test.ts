import { createReducerTransaction } from "./transaction";
import {
  createTestRandom,
  createTestTransaction,
} from "./transaction-test-fixtures";
import { defineGameDefinition as defineGame } from "./authoring/game";
import { createReducerTestingBundle } from "./bundle/ingress-bundle";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  defineGameContract,
  defineInteraction,
  definePhase,
} from "../reducer/internal";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "../reducer/advanced";
import {
  perPlayer,
  perPlayerGet,
  perPlayerKeys,
  type PlayerId,
} from "./per-player";

function pp<T>(
  playerIds: readonly string[],
  source: Readonly<Record<string, T>>,
  fallback: T,
) {
  return perPlayer(
    playerIds.map((id) => id as PlayerId),
    (id) =>
      Object.prototype.hasOwnProperty.call(source, id as string)
        ? source[id as string]!
        : fallback,
  );
}

function ppEmpty(
  playerIds: readonly string[],
): ReturnType<typeof perPlayer<Record<string, unknown>, PlayerId>> {
  return perPlayer(
    playerIds.map((id) => id as PlayerId),
    () => ({}) as Record<string, unknown>,
  );
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
    resources: perPlayer([] as PlayerId[], () => ({})),
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
  const phaseNames = ["defaultPhase", "draftPhase"] as const;
  const playerIds = ["player-1", "player-2", "player-3", "player-4"] as const;
  const resolvePlayerIds = (selectedPlayerIds?: readonly string[]) =>
    selectedPlayerIds && selectedPlayerIds.length > 0
      ? [...selectedPlayerIds]
      : [...playerIds];

  return {
    literals: {
      playerIds,
      phaseNames,
      cardSetIds: [] as const,
      cardTypes: [] as const,
      deckIds: [] as const,
      handIds: ["hand"] as const,
      sharedZoneIds: [] as const,
      playerZoneIds: ["hand"] as const,
      zoneIds: ["hand"] as const,
      cardIds: [] as const,
      resourceIds: ["coins"] as const,
      pieceTypeIds: [] as const,
      pieceIds: [] as const,
      dieTypeIds: [] as const,
      dieIds: [] as const,
      boardBaseIds: [] as const,
      boardIds: [] as const,
      boardContainerIds: [] as const,
      tileIds: [] as const,
      tileTypeIds: [] as const,
      edgeIds: [] as const,
      vertexIds: [] as const,
      portIds: [] as const,
      portTypeIds: [] as const,
      spaceIds: [] as const,
      spaceTypeIds: [] as const,
      handVisibilityById: { hand: "ownerOnly" } as const,
      zoneVisibilityById: { hand: "ownerOnly" } as const,
      cardSetIdByCardId: {},
      cardTypeByCardId: {},
      cardSetIdsBySharedZoneId: {},
      cardSetIdsByPlayerZoneId: {},
    },
    ids: {
      playerId: z.enum(playerIds),
      phaseName: z.enum(phaseNames),
      cardSetId: createManifestStringLiteralSchema([] as const),
      cardType: createManifestStringLiteralSchema([] as const),
      cardId: createManifestStringLiteralSchema([] as const),
      deckId: createManifestStringLiteralSchema([] as const),
      handId: createManifestStringLiteralSchema(["hand"] as const),
      sharedZoneId: createManifestStringLiteralSchema([] as const),
      playerZoneId: createManifestStringLiteralSchema(["hand"] as const),
      zoneId: createManifestStringLiteralSchema(["hand"] as const),
      resourceId: createManifestStringLiteralSchema(["coins"] as const),
      dieId: createManifestStringLiteralSchema([] as const),
      boardId: createManifestStringLiteralSchema([] as const),
      boardBaseId: createManifestStringLiteralSchema([] as const),
      boardContainerId: createManifestStringLiteralSchema([] as const),
      tileId: z.string(),
      tileTypeId: z.string(),
      edgeId: createManifestStringLiteralSchema([] as const),
      edgeTypeId: createManifestStringLiteralSchema([] as const),
      vertexId: createManifestStringLiteralSchema([] as const),
      vertexTypeId: createManifestStringLiteralSchema([] as const),
      portId: z.string(),
      portTypeId: z.string(),
      spaceId: createManifestStringLiteralSchema([] as const),
      spaceTypeId: createManifestStringLiteralSchema([] as const),
      pieceId: createManifestStringLiteralSchema([] as const),
      pieceTypeId: createManifestStringLiteralSchema([] as const),
    },
    defaults: {
      zones: (selectedPlayerIds?: readonly string[]) => ({
        shared: {},
        perPlayer: {
          hand: perPlayer(
            resolvePlayerIds(selectedPlayerIds).map((id) => id as PlayerId),
            () => [] as string[],
          ),
        },
        visibility: {},
      }),
      decks: () => ({}),
      hands: (selectedPlayerIds?: readonly string[]) => ({
        hand: perPlayer(
          resolvePlayerIds(selectedPlayerIds).map((id) => id as PlayerId),
          () => [] as string[],
        ),
      }),
      handVisibility: () => ({ hand: "ownerOnly" }),
      ownerOfCard: () => ({}),
      visibility: () => ({}),
      resources: (selectedPlayerIds?: readonly string[]) =>
        perPlayer(
          resolvePlayerIds(selectedPlayerIds).map((id) => id as PlayerId),
          () => ({ coins: 0 }),
        ),
    },
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  };
}

const BOOTSTRAP_PLAYER_IDS = ["player-1", "player-2"] as const;
const BOOTSTRAP_PHASE_NAMES = ["setup"] as const;
const BOOTSTRAP_CARD_IDS = ["card-1", "card-2", "card-3", "card-4"] as const;

function createBootstrapManifestContract() {
  return {
    literals: {
      playerIds: BOOTSTRAP_PLAYER_IDS,
      phaseNames: BOOTSTRAP_PHASE_NAMES,
      cardSetIds: ["main"] as const,
      cardTypes: ["card"] as const,
      deckIds: ["draw-deck"] as const,
      handIds: ["hand"] as const,
      sharedZoneIds: ["draw-deck"] as const,
      playerZoneIds: ["hand"] as const,
      zoneIds: ["draw-deck", "hand"] as const,
      cardIds: BOOTSTRAP_CARD_IDS,
      resourceIds: [] as const,
      pieceTypeIds: [] as const,
      pieceIds: [] as const,
      dieTypeIds: [] as const,
      dieIds: [] as const,
      boardBaseIds: [] as const,
      boardIds: [] as const,
      boardContainerIds: [] as const,
      tileIds: [] as const,
      tileTypeIds: [] as const,
      edgeIds: [] as const,
      vertexIds: [] as const,
      portIds: [] as const,
      portTypeIds: [] as const,
      spaceIds: [] as const,
      spaceTypeIds: [] as const,
      handVisibilityById: { hand: "ownerOnly" } as const,
      zoneVisibilityById: {
        "draw-deck": "public",
        hand: "ownerOnly",
      } as const,
      cardSetIdByCardId: {
        "card-1": "main",
        "card-2": "main",
        "card-3": "main",
        "card-4": "main",
      } as const,
      cardTypeByCardId: {
        "card-1": "card",
        "card-2": "card",
        "card-3": "card",
        "card-4": "card",
      } as const,
      cardSetIdsBySharedZoneId: {
        "draw-deck": ["main"],
      } as const,
      cardSetIdsByPlayerZoneId: {
        hand: ["main"],
      } as const,
    },
    ids: {
      playerId: z.enum(BOOTSTRAP_PLAYER_IDS),
      phaseName: z.enum(BOOTSTRAP_PHASE_NAMES),
      cardSetId: z.enum(["main"]),
      cardType: z.enum(["card"]),
      cardId: z.enum(BOOTSTRAP_CARD_IDS),
      deckId: z.enum(["draw-deck"]),
      handId: z.enum(["hand"]),
      sharedZoneId: z.enum(["draw-deck"]),
      playerZoneId: z.enum(["hand"]),
      zoneId: z.enum(["draw-deck", "hand"]),
      resourceId: z.string(),
      dieId: z.string(),
      boardId: z.string(),
      boardBaseId: z.string(),
      boardContainerId: z.string(),
      tileId: z.string(),
      tileTypeId: z.string(),
      edgeId: z.string(),
      edgeTypeId: z.string(),
      vertexId: z.string(),
      vertexTypeId: z.string(),
      portId: z.string(),
      portTypeId: z.string(),
      spaceId: z.string(),
      spaceTypeId: z.string(),
      pieceId: z.string(),
      pieceTypeId: z.string(),
    },
    defaults: {
      zones: (selectedPlayerIds?: readonly string[]) => ({
        shared: {
          "draw-deck": [...BOOTSTRAP_CARD_IDS],
        },
        perPlayer: {
          hand: pp<string[]>(selectedPlayerIds ?? BOOTSTRAP_PLAYER_IDS, {}, []),
        },
        visibility: {
          "draw-deck": "public",
          hand: "ownerOnly",
        },
        cardSetIdsByZoneId: {
          "draw-deck": ["main"],
          hand: ["main"],
        },
      }),
      decks: () => ({
        "draw-deck": [...BOOTSTRAP_CARD_IDS],
      }),
      hands: (selectedPlayerIds?: readonly string[]) => ({
        hand: pp<string[]>(selectedPlayerIds ?? BOOTSTRAP_PLAYER_IDS, {}, []),
      }),
      handVisibility: () => ({
        hand: "ownerOnly",
      }),
      ownerOfCard: () =>
        Object.fromEntries(BOOTSTRAP_CARD_IDS.map((cardId) => [cardId, null])),
      visibility: () =>
        Object.fromEntries(
          BOOTSTRAP_CARD_IDS.map((cardId) => [cardId, { faceUp: true }]),
        ),
      resources: (selectedPlayerIds?: readonly string[]) =>
        ppEmpty(selectedPlayerIds ?? BOOTSTRAP_PLAYER_IDS),
    },
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  };
}

function createBootstrapTable(): RuntimeTableRecord {
  return {
    ...createEmptyTable([...BOOTSTRAP_PLAYER_IDS]),
    componentLocations: Object.fromEntries(
      BOOTSTRAP_CARD_IDS.map((id, position) => [
        id,
        { type: "InDeck", deckId: "draw-deck", position, playedBy: null },
      ]),
    ),
    cards: Object.fromEntries(
      BOOTSTRAP_CARD_IDS.map((cardId) => [
        cardId,
        {
          id: cardId,
          cardSetId: "main",
          cardType: "card",
          properties: {},
        },
      ]),
    ),
  } as RuntimeTableRecord;
}

function createBootstrapGame(
  initialize: (tx: ReturnType<typeof createTestTransaction>) => void,
) {
  const manifest = createBootstrapManifestContract();
  const contract = defineGameContract({
    manifest,
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: {
      setup: z.object({}),
    },
  });

  return defineGame({
    contract,
    initialPhase: "setup",
    phases: {
      setup: definePhase<typeof contract>()({
        kind: "auto",
        state: z.object({}),
        initialState: () => ({}),
        enter: ({ tx }) => initialize(tx),
      }),
    },
    view: () => ({}),
  });
}

describe("initialization runtime", () => {
  test("parsed options reach initial state and each phase initializer and survive restoration", async () => {
    const contract = defineGameContract({
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
    const game = defineGame({
      contract,
      initial: {
        public: ({ options }) => ({ mode: options.mode }),
        private: ({ options }) => ({ rounds: options.rounds }),
        hidden: ({ options }) => ({ mode: options.mode }),
      },
      initialPhase: "defaultPhase",
      phases: {
        defaultPhase: definePhase<typeof contract>()({
          kind: "auto",
          state: contract.phases.defaultPhase,
          initialState: ({ options }) => ({ mode: options.mode }),
          enter: ({ tx }) => tx.transition("draftPhase"),
        }),
        draftPhase: definePhase<typeof contract>()({
          kind: "player",
          state: contract.phases.draftPhase,
          initialState: ({ options }) => ({ mode: options.mode }),
          interactions: {
            next: defineInteraction<typeof contract>()({
              inputs: {},
              reduce: ({ tx }) => tx.transition("draftPhase"),
            }),
          },
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingBundle(game);
    const request = {
      table: createEmptyTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 42,
      options: { mode: "draft" },
    };
    const initialized = await bundle.initialize(request);
    expect(initialized.runtime.options).toEqual({ mode: "draft", rounds: 3 });
    expect(initialized.domain.publicState).toEqual({ mode: "draft" });
    expect(initialized.domain.hiddenState).toEqual({ mode: "draft" });
    expect(initialized.domain.privateState).toEqual({
      "player-1": { rounds: 3 },
      "player-2": { rounds: 3 },
    });
    expect(initialized.domain.phase).toEqual({ mode: "draft" });
    const restored = JSON.parse(JSON.stringify(initialized));
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
      await expect(
        bundle.initialize({ ...request, options }),
      ).rejects.toThrow();
      expect(() =>
        bundle.project({
          state: { ...restored, runtime: { ...restored.runtime, options } },
          playerIds: ["player-1"],
        }),
      ).toThrow();
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
      expect(() =>
        defineGameContract({
          manifest: createManifestContract(),
          options: options as never,
          phases: { defaultPhase: z.object({}) },
          state: {
            public: z.object({}),
            private: z.object({}),
            hidden: z.object({}),
          },
        }),
      ).toThrow();
    }
  });

  test("initialize only materializes the actual session players for per-player hands and resources", async () => {
    const contract = defineGameContract({
      manifest: createManifestContract(),
      phases: { defaultPhase: z.object({}), draftPhase: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });

    const game = defineGame({
      contract,
      initialPhase: "defaultPhase",
      phases: {
        defaultPhase: definePhase<typeof contract>()({
          kind: "auto",
          state: z.object({}),
          initialState: () => ({}),
        }),
        draftPhase: definePhase<typeof contract>()({
          kind: "auto",
          state: z.object({}),
          initialState: () => ({}),
        }),
      },
      view: () => ({}),
    });

    const bundle = createReducerTestingBundle(game);
    const initialized = await bundle.initialize({
      table: createEmptyTable(["player-1", "player-2"]),
      playerIds: ["player-1", "player-2"],
      rngSeed: 7,
    });

    expect(perPlayerKeys(initialized.domain.table.hands.hand)).toEqual([
      "player-1",
      "player-2",
    ]);
    expect(perPlayerKeys(initialized.domain.table.resources)).toEqual([
      "player-1",
      "player-2",
    ]);
    expect(
      perPlayerGet(initialized.domain.table.resources, "player-1" as PlayerId),
    ).toEqual({
      coins: 0,
    });
    expect(
      perPlayerGet(initialized.domain.table.resources, "player-3" as PlayerId),
    ).toBeUndefined();
  });

  test("initialize preserves explicit deck, hand, and component location state", async () => {
    const playerIds = ["player-1", "player-2"] as const;
    const phaseNames = ["defaultPhase"] as const;
    const deckIds = ["draw-deck"] as const;
    const handIds = ["hand"] as const;
    const cardIds = ["card-1", "card-2"] as const;

    const contract = defineGameContract({
      manifest: {
        literals: {
          playerIds,
          phaseNames,
          cardSetIds: ["main"] as const,
          cardTypes: ["thing"] as const,
          deckIds,
          handIds,
          sharedZoneIds: deckIds,
          playerZoneIds: handIds,
          zoneIds: ["draw-deck", "hand"] as const,
          cardIds,
          resourceIds: [] as const,
          pieceTypeIds: [] as const,
          pieceIds: [] as const,
          dieTypeIds: [] as const,
          dieIds: [] as const,
          boardBaseIds: [] as const,
          boardIds: [] as const,
          boardContainerIds: [] as const,
          tileIds: [] as const,
          tileTypeIds: [] as const,
          edgeIds: [] as const,
          vertexIds: [] as const,
          portIds: [] as const,
          portTypeIds: [] as const,
          spaceIds: [] as const,
          spaceTypeIds: [] as const,
          handVisibilityById: { hand: "ownerOnly" } as const,
          zoneVisibilityById: {
            "draw-deck": "public",
            hand: "ownerOnly",
          } as const,
          cardSetIdByCardId: {
            "card-1": "main",
            "card-2": "main",
          } as const,
          cardTypeByCardId: {
            "card-1": "thing",
            "card-2": "thing",
          } as const,
          cardSetIdsBySharedZoneId: {
            "draw-deck": ["main"],
          } as const,
          cardSetIdsByPlayerZoneId: {
            hand: ["main"],
          } as const,
        },
        ids: {
          playerId: z.enum(playerIds),
          phaseName: z.enum(phaseNames),
          cardSetId: z.enum(["main"]),
          cardType: z.enum(["thing"]),
          cardId: z.enum(cardIds),
          deckId: z.enum(deckIds),
          handId: z.enum(handIds),
          sharedZoneId: z.enum(deckIds),
          playerZoneId: z.enum(handIds),
          zoneId: z.enum(["draw-deck", "hand"]),
          resourceId: z.string(),
          dieId: z.string(),
          boardId: z.string(),
          boardBaseId: z.string(),
          boardContainerId: z.string(),
          tileId: z.string(),
          tileTypeId: z.string(),
          edgeId: z.string(),
          edgeTypeId: z.string(),
          vertexId: z.string(),
          vertexTypeId: z.string(),
          portId: z.string(),
          portTypeId: z.string(),
          spaceId: z.string(),
          spaceTypeId: z.string(),
          pieceId: z.string(),
          pieceTypeId: z.string(),
        },
        defaults: {
          zones: (selectedPlayerIds?: readonly string[]) => ({
            shared: {
              "draw-deck": [],
            },
            perPlayer: {
              hand: perPlayer(
                (selectedPlayerIds ?? playerIds).map((id) => id as PlayerId),
                () => [] as string[],
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
          }),
          decks: () => ({
            "draw-deck": [],
          }),
          hands: (selectedPlayerIds?: readonly string[]) => ({
            hand: perPlayer(
              (selectedPlayerIds ?? playerIds).map((id) => id as PlayerId),
              () => [] as string[],
            ),
          }),
          handVisibility: () => ({
            hand: "ownerOnly",
          }),
          ownerOfCard: () => ({
            "card-1": null,
            "card-2": null,
          }),
          visibility: () => ({
            "card-1": { faceUp: true },
            "card-2": { faceUp: false, visibleTo: ["player-2"] },
          }),
          resources: () => perPlayer([], () => ({})),
        },
        tableSchema: z.custom<RuntimeTableRecord>(),
        runtimeSchema: z.any(),
        createGameStateSchema: () => z.any(),
      },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
      phases: {
        defaultPhase: z.object({}),
      },
    });

    const game = defineGame({
      contract,
      initialPhase: "defaultPhase",
      phases: {
        defaultPhase: definePhase<typeof contract>()({
          kind: "auto",
          state: z.object({}),
          initialState: () => ({}),
        }),
      },
      view: () => ({}),
    });

    const bundle = createReducerTestingBundle(game);
    const initialized = await bundle.initialize({
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
    });

    expect(initialized.domain.table.playerOrder).toEqual([
      "player-1",
      "player-2",
    ]);
    expect(initialized.domain.table.decks["draw-deck"]).toEqual(["card-1"]);
    expect(
      perPlayerGet(initialized.domain.table.hands.hand, "player-1" as PlayerId),
    ).toEqual([]);
    expect(
      perPlayerGet(initialized.domain.table.hands.hand, "player-2" as PlayerId),
    ).toEqual(["card-2"]);
    expect(initialized.domain.table.componentLocations["card-1"]).toEqual({
      type: "InDeck",
      deckId: "draw-deck",
      playedBy: null,
      position: 0,
    });
    expect(initialized.domain.table.componentLocations["card-2"]).toEqual({
      type: "InHand",
      handId: "hand",
      playerId: "player-2",
      position: 0,
    });
  });

  test("games without an options schema reject undeclared lobby options", async () => {
    const bundle = createReducerTestingBundle(createBootstrapGame(() => {}));
    const request = {
      table: createBootstrapTable(),
      playerIds: [...BOOTSTRAP_PLAYER_IDS],
      rngSeed: 42,
    };
    expect((await bundle.initialize(request)).runtime.options).toEqual({});
    await expect(
      bundle.initialize({ ...request, options: { undeclared: true } }),
    ).rejects.toThrow();
  });

  test("phase entry shuffles with seeded entropy", async () => {
    const bundle = createReducerTestingBundle(
      createBootstrapGame((tx) => {
        tx.shuffle({ zoneId: "draw-deck" });
      }),
    );

    const initialized = await bundle.initialize({
      table: createBootstrapTable(),
      playerIds: [...BOOTSTRAP_PLAYER_IDS],
      rngSeed: 42,
    });
    const order = initialized.domain.table.zones.shared["draw-deck"];

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
    const bundle = createReducerTestingBundle(
      createBootstrapGame((tx) => {
        for (const playerId of tx.q.player.order())
          tx.deal({
            fromZoneId: "draw-deck",
            toZoneId: "hand",
            playerId,
            count: 1,
          });
      }),
    );

    const initialized = await bundle.initialize({
      table: createBootstrapTable(),
      playerIds: [...BOOTSTRAP_PLAYER_IDS],
      rngSeed: 42,
    });

    expect(initialized.domain.table.zones.shared["draw-deck"]).toEqual([
      "card-3",
      "card-4",
    ]);
    expect(
      perPlayerGet(initialized.domain.table.hands.hand, "player-1" as PlayerId),
    ).toEqual(["card-1"]);
    expect(
      perPlayerGet(initialized.domain.table.hands.hand, "player-2" as PlayerId),
    ).toEqual(["card-2"]);
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

    const random = createTestRandom(initialState.runtime.rng.seed!);
    const tx = createReducerTransaction(initialState, random);
    tx.shuffle({ zoneId: "draw-deck" });
    for (const playerId of tx.q.player.order())
      tx.deal({
        fromZoneId: "draw-deck",
        toZoneId: "hand",
        playerId,
        count: 1,
      });
    for (const componentId of ["piece-1", "die-1"])
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
    expect(
      perPlayerGet(nextState.table.hands.hand, "player-1" as PlayerId),
    ).toHaveLength(1);
    expect(
      perPlayerGet(nextState.table.hands.hand, "player-2" as PlayerId),
    ).toHaveLength(1);
    expect(
      perPlayerGet(nextState.table.hands.hand, "player-1" as PlayerId),
    ).not.toEqual(
      perPlayerGet(nextState.table.hands.hand, "player-2" as PlayerId),
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
    const contract = defineGameContract({
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

    const game = defineGame({
      contract,
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
        defaultPhase: definePhase<typeof contract>()({
          kind: "auto",
          state: z.object({}),
          initialState: () => ({}),
        }),
        draftPhase: definePhase<typeof contract>()({
          kind: "auto",
          state: z.object({}),
          initialState: () => ({}),
        }),
      },
      view: () => ({}),
    });

    const bundle = createReducerTestingBundle(game);
    const initialized = await bundle.initialize({
      table: createEmptyTable(["player-1", "player-2"]),
      playerIds: ["player-1", "player-2"],
      rngSeed: 1,
    });

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
