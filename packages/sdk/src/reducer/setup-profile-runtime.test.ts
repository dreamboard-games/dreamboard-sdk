import { defineGameDefinition as defineGame } from "./authoring/game";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  createReducerBundle,
  defineEmptyView,
  defineGameContract,
  defineInteraction,
  definePhase,
} from "../reducer";
import {
  applySetupBootstrap,
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
  type SetupBootstrapStep,
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

function createManifestContract(setupProfileIds: readonly string[]) {
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
      setupOptionIds: ["mode", "variant"] as const,
      setupProfileIds,
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
      setupOptionId: createManifestStringLiteralSchema([
        "mode",
        "variant",
      ] as const),
      setupProfileId: createManifestStringLiteralSchema(setupProfileIds),
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
    setupOptionsById: {
      mode: {
        id: "mode",
        name: "Mode",
        choices: [{ id: "draft", label: "Draft" }],
      },
      variant: {
        id: "variant",
        name: "Variant",
        choices: [{ id: "advanced", label: "Advanced" }],
      },
    },
    setupProfilesById: Object.fromEntries(
      setupProfileIds.map((profileId) => [
        profileId,
        {
          id: profileId,
          name: profileId,
          guidance: {
            summary: `Use ${profileId} setup.`,
            steps: [
              {
                id: "choose-mode",
                label: "Choose mode",
                description: "Select the setup mode before the draft begins.",
              },
            ],
          },
          optionValues: {
            mode: "draft",
          },
        },
      ]),
    ),
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  };
}

const BOOTSTRAP_PLAYER_IDS = ["player-1", "player-2"] as const;
const BOOTSTRAP_PHASE_NAMES = ["setup"] as const;
const BOOTSTRAP_PROFILE_IDS = ["bootstrap-profile"] as const;
const BOOTSTRAP_CARD_IDS = ["card-1", "card-2", "card-3", "card-4"] as const;

function createBootstrapManifestContract() {
  return {
    literals: {
      playerIds: BOOTSTRAP_PLAYER_IDS,
      phaseNames: BOOTSTRAP_PHASE_NAMES,
      setupOptionIds: [] as const,
      setupProfileIds: BOOTSTRAP_PROFILE_IDS,
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
      setupOptionId: z.string(),
      setupProfileId: z.enum(BOOTSTRAP_PROFILE_IDS),
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
    setupOptionsById: {},
    setupProfilesById: {
      "bootstrap-profile": {
        id: "bootstrap-profile",
        name: "Bootstrap profile",
        optionValues: {},
      },
    },
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  };
}

type BootstrapManifest = ReturnType<typeof createBootstrapManifestContract>;

function createBootstrapTable(): RuntimeTableRecord {
  return {
    ...createEmptyTable([...BOOTSTRAP_PLAYER_IDS]),
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
  bootstrap: readonly SetupBootstrapStep<BootstrapManifest>[],
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
    setupProfiles: {
      "bootstrap-profile": {
        initialPhase: "setup",
        bootstrap,
      },
    },
    phases: {
      setup: definePhase<typeof contract>()({
        kind: "auto",
        state: z.object({}),
        initialState: () => ({}),
      }),
    },
    views: {
      shared: defineEmptyView<typeof contract>(),
      player: defineEmptyView<typeof contract>(),
    },
  });
}

describe("setup profile runtime", () => {
  test("selected setup profile overrides the initial phase and is available in reducer initialization contexts", async () => {
    const manifest = createManifestContract(["draft-profile"] as const);
    const contract = defineGameContract({
      manifest,
      phases: { defaultPhase: z.object({}), draftPhase: z.object({}) },
      state: {
        public: z.object({
          publicSetupProfileId: manifest.ids.setupProfileId.nullable(),
          enterSetupProfileId: manifest.ids.setupProfileId.nullable(),
          actionSetupProfileId: manifest.ids.setupProfileId.nullable(),
        }),
        private: z.object({
          privateSetupProfileId: manifest.ids.setupProfileId.nullable(),
        }),
        hidden: z.object({
          hiddenSetupProfileId: manifest.ids.setupProfileId.nullable(),
        }),
      },
    });

    const phases = {
      defaultPhase: definePhase<typeof contract>()({
        kind: "auto",
        state: z.object({}),
        initialState: () => ({}),
      }),
      draftPhase: definePhase<typeof contract>()({
        kind: "player",
        name: "Draft phase",
        guidance: {
          summary: "Draft using the selected setup profile.",
          objective: "Record the setup profile before play continues.",
        },
        state: z.object({}),
        initialState: () => ({}),
        enter({ state, accept, setup }) {
          return accept({
            ...state,
            publicState: {
              ...state.publicState,
              enterSetupProfileId: setup?.profileId ?? null,
            },
          });
        },
        interactions: {
          recordSetup: defineInteraction<typeof contract>()({
            inputs: {},
            reduce({ state, accept, setup }) {
              return accept({
                ...state,
                publicState: {
                  ...state.publicState,
                  actionSetupProfileId: setup?.profileId ?? null,
                },
              });
            },
          }),
        },
      }),
    };

    const game = defineGame({
      contract,
      initial: {
        public: ({ setup }) => ({
          publicSetupProfileId: setup?.profileId ?? null,
          enterSetupProfileId: null,
          actionSetupProfileId: null,
        }),
        private: ({ setup }) => ({
          privateSetupProfileId: setup?.profileId ?? null,
        }),
        hidden: ({ setup }) => ({
          hiddenSetupProfileId: setup?.profileId ?? null,
        }),
      },
      initialPhase: "defaultPhase",
      setupProfiles: {
        "draft-profile": {
          initialPhase: "draftPhase",
        },
      },
      phases,
      views: {
        shared: defineEmptyView<typeof contract>(),
        player: defineEmptyView<typeof contract>(),
      },
    });

    const bundle = createReducerBundle(game);
    const initialized = await bundle.initialize({
      table: createEmptyTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 42,
      setup: {
        profileId: "draft-profile",
      },
    });

    expect(initialized.domain.flow.currentPhase).toBe("draftPhase");
    expect(initialized.runtime.setup).toEqual({
      profileId: "draft-profile",
      optionValues: {
        mode: "draft",
        variant: null,
      },
    });
    expect(initialized.domain.publicState).toEqual({
      publicSetupProfileId: "draft-profile",
      enterSetupProfileId: "draft-profile",
      actionSetupProfileId: null,
    });
    expect(initialized.domain.privateState["player-1"]).toEqual({
      privateSetupProfileId: "draft-profile",
    });
    expect(initialized.domain.hiddenState).toEqual({
      hiddenSetupProfileId: "draft-profile",
    });
    expect(
      bundle.projectSeatsDynamic({
        state: initialized,
        playerIds: ["player-1"],
      }).guidance,
    ).toEqual({
      phase: {
        id: "draftPhase",
        label: "Draft phase",
        summary: "Draft using the selected setup profile.",
        objective: "Record the setup profile before play continues.",
      },
      setup: {
        profileId: "draft-profile",
        name: "draft-profile",
        summary: "Use draft-profile setup.",
        steps: [
          {
            id: "choose-mode",
            label: "Choose mode",
            description: "Select the setup mode before the draft begins.",
          },
        ],
      },
    });

    const reduced = await bundle.reduce({
      state: initialized,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "recordSetup",
        params: {},
      },
    });

    expect(reduced.kind).toBe("accept");
    if (reduced.kind !== "accept") {
      throw new Error("Expected reducer action to be accepted.");
    }
    expect(reduced.state.domain.publicState).toEqual({
      publicSetupProfileId: "draft-profile",
      enterSetupProfileId: "draft-profile",
      actionSetupProfileId: "draft-profile",
    });
  });

  test("initialize only materializes the actual session players for per-player hands and resources", async () => {
    const contract = defineGameContract({
      manifest: createManifestContract(["draft-profile"] as const),
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
      setupProfiles: {
        "draft-profile": {},
      },
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
      views: {
        shared: defineEmptyView<typeof contract>(),
        player: defineEmptyView<typeof contract>(),
      },
    });

    const bundle = createReducerBundle(game);
    const initialized = await bundle.initialize({
      table: createEmptyTable(["player-1", "player-2"]),
      playerIds: ["player-1", "player-2"],
      rngSeed: 7,
      setup: {
        profileId: "draft-profile",
      },
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
          setupOptionIds: [] as const,
          setupProfileIds: [] as const,
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
          setupOptionId: z.string(),
          setupProfileId: z.string(),
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
        setupOptionsById: {},
        setupProfilesById: {},
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
      views: {
        shared: defineEmptyView<typeof contract>(),
        player: defineEmptyView<typeof contract>(),
      },
    });

    const bundle = createReducerBundle(game);
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

  test("bundle creation fails fast when reducer setup profiles do not match the manifest", () => {
    const contract = defineGameContract({
      manifest: createManifestContract([
        "base-profile",
        "draft-profile",
      ] as const),
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
      setupProfiles: {
        "base-profile": {
          initialPhase: "defaultPhase",
        },
        "draft-profile": {
          initialPhase: "draftPhase",
        },
      },
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
      views: {
        shared: defineEmptyView<typeof contract>(),
        player: defineEmptyView<typeof contract>(),
      },
    });

    const mismatchedGame = {
      ...game,
      setupProfiles: {
        "draft-profile": {
          initialPhase: "draftPhase",
        },
      },
    };

    expect(() => createReducerBundle(mismatchedGame)).toThrow(
      "Reducer setupProfiles must exactly match manifest setupProfiles. Manifest=[base-profile, draft-profile], reducer=[draft-profile].",
    );
  });

  test("bundle.initialize applies setup profile bootstrap shuffle steps", async () => {
    const bundle = createReducerBundle(
      createBootstrapGame([
        {
          type: "shuffle",
          container: {
            type: "sharedZone",
            zoneId: "draw-deck",
          },
        },
      ]),
    );

    const initialized = await bundle.initialize({
      table: createBootstrapTable(),
      playerIds: [...BOOTSTRAP_PLAYER_IDS],
      rngSeed: 42,
      setup: {
        profileId: "bootstrap-profile",
      },
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

  test("bundle.initialize applies setup profile bootstrap deal steps", async () => {
    const bundle = createReducerBundle(
      createBootstrapGame([
        {
          type: "deal",
          from: {
            type: "sharedZone",
            zoneId: "draw-deck",
          },
          to: {
            type: "playerZone",
            zoneId: "hand",
          },
          count: 1,
        },
      ]),
    );

    const initialized = await bundle.initialize({
      table: createBootstrapTable(),
      playerIds: [...BOOTSTRAP_PLAYER_IDS],
      rngSeed: 42,
      setup: {
        profileId: "bootstrap-profile",
      },
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

  test("applySetupBootstrap shuffles, deals cards, and places pieces and dice onto board spaces", () => {
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
        setup: null,
        simultaneous: { current: null },
        lastTransition: null,
      },
    };

    const nextState = applySetupBootstrap(initialState, [
      {
        type: "shuffle",
        container: {
          type: "sharedZone",
          zoneId: "draw-deck",
        },
      },
      {
        type: "deal",
        from: {
          type: "sharedZone",
          zoneId: "draw-deck",
        },
        to: {
          type: "playerZone",
          zoneId: "hand",
        },
        count: 1,
      },
      {
        type: "move",
        from: {
          type: "sharedZone",
          zoneId: "supply",
        },
        to: {
          type: "sharedBoardSpace",
          boardId: "main-board",
          spaceId: "space-a",
        },
        componentIds: ["piece-1", "die-1"],
      },
    ]);

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

  test("applySetupBootstrap rejects cards entering incompatible zones and board containers", () => {
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
        setup: null,
        simultaneous: { current: null },
        lastTransition: null,
      },
    };

    expect(() =>
      applySetupBootstrap(initialState, [
        {
          type: "deal",
          from: {
            type: "sharedZone",
            zoneId: "draw-deck",
          },
          to: {
            type: "playerZone",
            zoneId: "hand",
          },
          count: 1,
          playerIds: ["player-1"],
        },
      ]),
    ).toThrow("cannot enter zone 'hand'");

    expect(() =>
      applySetupBootstrap(initialState, [
        {
          type: "move",
          from: {
            type: "sharedZone",
            zoneId: "draw-deck",
          },
          to: {
            type: "sharedBoardContainer",
            boardId: "main-board",
            containerId: "restricted-row",
          },
          count: 1,
        },
      ]),
    ).toThrow("cannot enter container 'restricted-row'");
  });

  test("initialize injects table queries (q) into initial.public/private/hidden callbacks", async () => {
    const contract = defineGameContract({
      manifest: createManifestContract(["draft-profile"] as const),
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
      setupProfiles: {
        "draft-profile": {},
      },
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
      views: {
        shared: defineEmptyView<typeof contract>(),
        player: defineEmptyView<typeof contract>(),
      },
    });

    const bundle = createReducerBundle(game);
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
