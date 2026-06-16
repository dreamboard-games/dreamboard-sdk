import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  defineCardAction,
  defineGame,
  defineGameContract,
  defineInputs,
  defineInteraction,
  definePhase,
  formInput,
  many,
  pipe,
  type GameStateOf,
  type PlayerId,
} from "../reducer";
import {
  createManifestStringLiteralSchema,
  type ClientParamsOfInteractionOfDefinition,
  type InputKeysWithCollectorKindOfDefinition,
  type ReducerManifestContract,
  type RuntimeCardData,
  type RuntimeRecord,
  type RuntimeTableRecord,
} from "../reducer/advanced";

type TestPlayerId = PlayerId;
type TestCardId = "card-1" | "card-2";
type TestPlayerZoneId = "hand" | "in-play" | "discard";

type TestPerPlayer<Value> = {
  readonly __perPlayer: true;
  readonly entries: ReadonlyArray<readonly [TestPlayerId, Value]>;
};

type TestTable = Omit<
  RuntimeTableRecord,
  "playerOrder" | "cards" | "hands" | "resources"
> & {
  playerOrder: TestPlayerId[];
  cards: Record<TestCardId, RuntimeCardData>;
  hands: Record<TestPlayerZoneId, TestPerPlayer<TestCardId[]>>;
  resources: TestPerPlayer<RuntimeRecord>;
};

function testPerPlayer<Value>(): TestPerPlayer<Value> {
  return { __perPlayer: true, entries: [] };
}

function buildContract() {
  const playerIds = [
    "player-1",
    "player-2",
  ] as const as unknown as readonly PlayerId[];
  const cardIds = ["card-1", "card-2"] as const;
  const playerZoneIds = ["hand", "in-play", "discard"] as const;
  const phaseNames = ["play"] as const;

  const manifest = {
    literals: {
      playerIds,
      phaseNames,
      boardLayouts: [] as const,
      setupOptionIds: [] as const,
      setupProfileIds: [] as const,
      cardSetIds: ["cards"] as const,
      cardTypes: ["action"] as const,
      deckIds: [] as const,
      handIds: playerZoneIds,
      sharedZoneIds: [] as const,
      playerZoneIds,
      zoneIds: playerZoneIds,
      cardIds,
      resourceIds: [] as const,
      pieceTypeIds: [] as const,
      pieceIds: [] as const,
      dieTypeIds: [] as const,
      dieIds: [] as const,
      boardTemplateIds: [] as const,
      boardTypeIds: [] as const,
      boardBaseIds: [] as const,
      boardIds: [] as const,
      boardContainerIds: [] as const,
      relationTypeIds: [] as const,
      edgeIds: [] as const,
      edgeTypeIds: [] as const,
      vertexIds: [] as const,
      vertexTypeIds: [] as const,
      spaceIds: [] as const,
      spaceTypeIds: [] as const,
      handVisibilityById: {
        hand: "ownerOnly",
        "in-play": "public",
        discard: "public",
      } as const,
      zoneVisibilityById: {
        hand: "ownerOnly",
        "in-play": "public",
        discard: "public",
      } as const,
      setupChoiceIdsByOptionId: {},
      cardSetIdByCardId: {
        "card-1": "cards",
        "card-2": "cards",
      },
      cardTypeByCardId: {
        "card-1": "action",
        "card-2": "action",
      },
      cardSetIdsBySharedZoneId: {},
      cardSetIdsByPlayerZoneId: {
        hand: ["cards"],
        "in-play": ["cards"],
        discard: ["cards"],
      },
    },
    ids: {
      playerId: createManifestStringLiteralSchema(playerIds),
      phaseName: createManifestStringLiteralSchema(phaseNames),
      boardLayout: z.never(),
      setupOptionId: z.never(),
      setupProfileId: z.never(),
      cardSetId: createManifestStringLiteralSchema(["cards"] as const),
      cardType: createManifestStringLiteralSchema(["action"] as const),
      cardId: createManifestStringLiteralSchema(cardIds),
      deckId: z.never(),
      handId: createManifestStringLiteralSchema(playerZoneIds),
      sharedZoneId: z.never(),
      playerZoneId: createManifestStringLiteralSchema(playerZoneIds),
      zoneId: createManifestStringLiteralSchema(playerZoneIds),
      resourceId: z.never(),
      pieceTypeId: z.never(),
      pieceId: z.never(),
      dieId: z.never(),
      dieTypeId: z.never(),
      boardTypeId: z.never(),
      boardId: z.never(),
      boardBaseId: z.never(),
      boardContainerId: z.never(),
      relationTypeId: z.never(),
      edgeId: z.never(),
      edgeTypeId: z.never(),
      vertexId: z.never(),
      vertexTypeId: z.never(),
      spaceId: z.never(),
      spaceTypeId: z.never(),
    },
    defaults: {
      zones: () => ({ shared: {}, perPlayer: {}, visibility: {} }),
      decks: () => ({}),
      hands: () => ({
        hand: testPerPlayer<TestCardId[]>([]),
        "in-play": testPerPlayer<TestCardId[]>([]),
        discard: testPerPlayer<TestCardId[]>([]),
      }),
      handVisibility: () => ({}),
      ownerOfCard: () => ({}),
      visibility: () => ({}),
      resources: () => testPerPlayer<RuntimeRecord>({}),
    },
    setupOptionsById: {},
    setupChoiceIdsByOptionId: {},
    setupProfilesById: {},
    tableSchema: z.custom<TestTable>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  } satisfies ReducerManifestContract<
    TestTable,
    (typeof phaseNames)[number],
    TestPlayerId,
    never,
    TestPlayerZoneId,
    TestCardId
  >;

  return defineGameContract({
    manifest,
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: {
      play: z.object({}),
    },
  });
}

describe("interaction input id types", () => {
  test("does not expose raw form inputs for author-provided Zod schemas", () => {
    expect("raw" in formInput).toBe(false);

    const assertRawFormInputsRejected = () => {
      // @ts-expect-error raw Zod schemas are not default-renderable inputs.
      formInput.raw(z.string());

      // @ts-expect-error arbitrary Zod schemas are not default-renderable inputs.
      formInput(z.string());
    };
    expect(typeof assertRawFormInputsRejected).toBe("function");
  });

  test("contract-declared error maps type authored rule and reject codes", () => {
    const contract = defineGameContract({
      manifest: buildContract().manifest,
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
      phases: {
        play: z.object({}),
      },
      errors: {
        INSUFFICIENT_RESOURCES: "Cannot afford that action.",
      },
    });
    const phaseState = z.object({});

    const assertErrorCodeTypes = () => {
      defineInteractionRule<typeof contract, typeof phaseState>()({
        id: "known-code",
        errorCode: "INSUFFICIENT_RESOURCES",
        validate: () => ({
          errorCode: "INSUFFICIENT_RESOURCES",
        }),
      });

      defineInteractionRule<typeof contract, typeof phaseState>()({
        id: "framework-code",
        errorCode: "NOT_YOUR_TURN",
      });

      defineInteractionRule<typeof contract, typeof phaseState>()({
        id: "typo-code",
        // @ts-expect-error contracts with an errors map reject typo'd rule codes.
        errorCode: "INSUFFICIENT_RESOURCE",
      });

      defineInteraction<typeof contract, typeof phaseState>()({
        inputs: {},
        rules: [
          {
            id: "typo-validation-code",
            errorCode: "INSUFFICIENT_RESOURCES",
            validate: () => ({
              // @ts-expect-error ValidationIssue codes come from the contract error union.
              errorCode: "INSUFFICIENT_RESOURCE",
            }),
          },
        ],
        reduce: ({ reject }) => {
          // @ts-expect-error reject codes come from the contract error union.
          return reject("INSUFFICIENT_RESOURCE");
        },
      });
    };
    expect(typeof assertErrorCodeTypes).toBe("function");
    expect(phaseState.parse({})).toEqual({});

    type State = GameStateOf<typeof contract>;
    const assertStateExtraction = (state: State) => {
      const publicState: object = state.publicState;
      const phaseState: object = state.phase;
      return { publicState, phaseState };
    };
    expect(typeof assertStateExtraction).toBe("function");

    expect(contract.errors?.INSUFFICIENT_RESOURCES).toBe(
      "Cannot afford that action.",
    );
  });

  test("types playerId and form cardId from manifest schemas", () => {
    const contract = buildContract();
    const phaseState = z.object({ step: z.literal("main") });

    const interaction = defineInteraction<typeof contract, typeof phaseState>()(
      {
        inputs: {
          cardId: formInput(contract.schemas.cardId),
          cardType: formInput(contract.manifest.ids.cardType),
        },
        rules: [
          {
            id: "type-check-form-card",
            errorCode: "type-check-form-card",
            validate({ input }) {
              const playerId: TestPlayerId = input.playerId;
              const cardId: TestCardId = input.params.cardId;
              const cardType: "action" = input.params.cardType;
              void playerId;
              void cardId;
              void cardType;
              return null;
            },
          },
        ],
        reduce({ state, input, accept, ops }) {
          const playerId: TestPlayerId = input.playerId;
          const cardId: TestCardId = input.params.cardId;
          return accept(
            pipe(
              state,
              ops.moveCardBetweenPlayerZones({
                playerId,
                fromZoneId: "hand",
                toZoneId: "in-play",
                cardId,
              }),
            ),
          );
        },
      },
    );

    expect(Object.keys(interaction.inputs)).toEqual(["cardId", "cardType"]);
    expect(phaseState.parse({ step: "main" })).toEqual({ step: "main" });
  });

  test("state-bound formInput helpers type dynamic choice context", () => {
    type TestGameState = {
      table: TestTable;
      flow: { currentPhase: "play"; activePlayers: TestPlayerId[] };
    };
    const input = formInput.forState<TestGameState>();

    const selectedCards = input.choiceList<TestCardId>({
      choices: ({ q, playerId }) =>
        q.zone
          .playerCards(playerId, "hand")
          .map((cardId) => ({ value: cardId, label: cardId })),
      defaultValue: [],
    });

    const assertChoiceContextTypes = () => {
      input.choice({
        choices: ({ playerId }) => {
          const typedPlayerId: TestPlayerId = playerId;
          void typedPlayerId;
          return [{ value: "card-1", label: "Card 1" }];
        },
        defaultValue: "card-1",
      });
    };

    expect(selectedCards.defaultValue).toEqual([]);
    expect(typeof assertChoiceContextTypes).toBe("function");
  });

  test("types card action playerId and implicit cardId from manifest schemas", () => {
    const contract = buildContract();
    const phaseState = z.object({ step: z.literal("main") });

    const action = defineCardAction<typeof contract, typeof phaseState>()({
      cardType: "action",
      playFrom: "hand",
      reduce({ state, input, accept, ops }) {
        const playerId: TestPlayerId = input.playerId;
        const cardId: TestCardId = input.params.cardId;
        return accept(
          pipe(
            state,
            ops.moveCardBetweenPlayerZones({
              playerId,
              fromZoneId: "hand",
              toZoneId: "in-play",
              cardId,
            }),
          ),
        );
      },
    });

    expect(action.cardType).toBe("action");
    expect(contract.phaseNames).toEqual(["play"]);
    expect(phaseState.parse({ step: "main" })).toEqual({ step: "main" });
  });

  test("types many collectors as readonly arrays of base input values", () => {
    const contract = buildContract();
    const phaseState = z.object({ step: z.literal("main") });

    const interaction = defineInteraction<typeof contract, typeof phaseState>()(
      {
        inputs: {
          cardIds: many(formInput(contract.schemas.cardId), {
            count: 2,
            distinct: true,
          }),
        },
        rules: [
          {
            id: "type-check-many-cards",
            errorCode: "type-check-many-cards",
            validate({ input }) {
              const cardIds: readonly TestCardId[] = input.params.cardIds;
              // @ts-expect-error many collectors produce arrays, not scalars.
              const cardId: TestCardId = input.params.cardIds;
              void cardIds;
              void cardId;
              return null;
            },
          },
        ],
        reduce({ state, input, accept }) {
          const cardIds: readonly TestCardId[] = input.params.cardIds;
          void cardIds;
          return accept(state);
        },
      },
    );

    const assertManyCommitTypes = () => {
      defineInteraction<typeof contract, typeof phaseState>()({
        // @ts-expect-error many(...) inputs are explicit draft selections and cannot auto-submit.
        commit: { mode: "autoWhenReady" },
        inputs: {
          cardIds: many(formInput(contract.schemas.cardId), {
            count: 2,
            distinct: true,
          }),
        },
        reduce: ({ state, accept }) => accept(state),
      });

      defineCardAction<typeof contract, typeof phaseState>()({
        cardType: "action",
        playFrom: "hand",
        // @ts-expect-error many(...) card action inputs are explicit draft selections and cannot auto-submit.
        commit: { mode: "autoWhenReady" },
        inputs: {
          cardIds: many(formInput(contract.schemas.cardId), {
            count: 2,
            distinct: true,
          }),
        },
        reduce: ({ state, accept }) => accept(state),
      });
    };

    expect(Object.keys(interaction.inputs)).toEqual(["cardIds"]);
    expect(typeof assertManyCommitTypes).toBe("function");
    expect(phaseState.parse({ step: "main" })).toEqual({ step: "main" });
  });

  test("types simultaneous submit params with precise input keys", () => {
    const contract = buildContract();
    const phaseState = z.object({});

    const play = definePhase<typeof contract>()({
      kind: "simultaneousPlayer",
      state: phaseState,
      actors: () => ["player-1", "player-2"] as TestPlayerId[],
      submit: {
        inputs: {
          cardIds: many(formInput(contract.schemas.cardId), {
            count: 2,
            distinct: true,
          }),
        },
      },
      resolve: ({ state, accept }) => accept(state),
    });

    const game = defineGame({
      contract,
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      phases: { play },
    });

    type SubmitParams = ClientParamsOfInteractionOfDefinition<
      typeof game,
      "play",
      "submit"
    >;
    type SubmitKeys = keyof SubmitParams & string;
    type HasBroadKeys = string extends keyof SubmitParams ? true : false;

    const cardIds: SubmitKeys = "cardIds";
    const hasBroadKeys: HasBroadKeys = false;
    const params: SubmitParams = { cardIds: ["card-1", "card-2"] };

    const assertSubmitParamTypes = () => {
      // @ts-expect-error simultaneous submit params should expose authored keys, not arbitrary strings.
      const badKey: SubmitKeys = "whatever";
      void badKey;

      definePhase<typeof contract>()({
        kind: "simultaneousPlayer",
        state: phaseState,
        actors: () => ["player-1", "player-2"] as TestPlayerId[],
        submit: {
          // @ts-expect-error many(...) simultaneous submit inputs are explicit draft selections and cannot auto-submit.
          commit: { mode: "autoWhenReady" },
          inputs: {
            cardIds: many(formInput(contract.schemas.cardId), {
              count: 2,
              distinct: true,
            }),
          },
        },
        resolve: ({ state, accept }) => accept(state),
      });
    };

    expect(Object.keys(play.submit?.inputs ?? {})).toEqual(["cardIds"]);
    expect(game.phases.play).toBe(play);
    expect(typeof assertSubmitParamTypes).toBe("function");
    void cardIds;
    void hasBroadKeys;
    void params;
  });

  test("types collector-kind input keys for generated form maps", () => {
    const contract = buildContract();
    const phaseState = z.object({});

    const play = definePhase<typeof contract>()({
      kind: "player",
      state: phaseState,
      initialState: () => ({}),
      interactions: {
        chooseCard: defineInteraction<typeof contract, typeof phaseState>()({
          inputs: {
            cardId: formInput(contract.schemas.cardId),
          },
          reduce: ({ state, accept }) => accept(state),
        }),
      },
    });

    const game = defineGame({
      contract,
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      phases: { play },
    });

    type FormKeys = InputKeysWithCollectorKindOfDefinition<
      typeof game,
      "play",
      "chooseCard",
      "form"
    >;
    type PlannedFormInputs = {
      [K in FormKeys]: (slot: { key: K }) => unknown;
    };

    const valid = {
      cardId: (slot) => slot.key,
    } satisfies PlannedFormInputs;

    const assertGeneratedFormInputTypes = () => {
      // @ts-expect-error generated form inputs must include every key.
      const missing = {} satisfies PlannedFormInputs;
      void missing;

      const extra = {
        cardId: (slot) => slot.key,
        // @ts-expect-error generated form inputs reject undeclared keys.
        spaceId: (slot: { key: "spaceId" }) => slot.key,
      } satisfies PlannedFormInputs;
      void extra;
    };

    expect(Object.keys(play.interactions ?? {})).toEqual(["chooseCard"]);
    expect(game.phases.play).toBe(play);
    expect(typeof assertGeneratedFormInputTypes).toBe("function");
    void valid;
  });

  test("types dependent input callbacks with direct declared dependencies only", () => {
    const inputs = defineInputs((input) => {
      const spaceId = input.add(
        "spaceId",
        formInput.choice<"hex-a">({
          choices: [{ value: "hex-a", label: "Hex A" }] as const,
          defaultValue: "hex-a",
        }),
      );
      return {
        spaceId,
        playerId: input.add(
          "playerId",
          formInput.choice({
            dependsOn: [spaceId],
            choices: ({ values }) => {
              const selectedSpace: "hex-a" = values.spaceId;
              const assertDependencyValues = () => {
                // @ts-expect-error undeclared sibling inputs are not visible.
                const cardId = values.cardId;
                void cardId;
              };
              void selectedSpace;
              void assertDependencyValues;
              return [{ value: "player-1", label: "Player 1" }];
            },
            defaultValue: "player-1",
          }),
        ),
      };
    });

    expect(Object.keys(inputs)).toEqual(["spaceId", "playerId"]);
  });

  test("types mutation random helper without exposing runtime rng", () => {
    const contract = buildContract();
    const phaseState = z.object({});

    const phase = definePhase<typeof contract>()({
      kind: "player",
      state: phaseState,
      initialState: () => ({}),
      enter({ state, accept, random, runtime }) {
        const selected = random.subset({
          from: ["card-1", "card-2"] as const,
          count: 1,
        });
        const cardId: TestCardId = selected[0]!;
        const assertEnterRuntimeShape = () => {
          // @ts-expect-error runtime rng is internal; authored mutation callbacks use random helpers.
          const rng = runtime.rng;
          void rng;
        };
        void cardId;
        void assertEnterRuntimeShape;
        return accept(state);
      },
      interactions: {
        choose: defineInteraction<typeof contract, typeof phaseState>()({
          inputs: {},
          reduce({ state, accept, random, runtime }) {
            const selected = random.subset({
              from: ["card-1", "card-2"] as const,
              count: 1,
            });
            const cardId: TestCardId = selected[0]!;
            const assertReduceRuntimeShape = () => {
              // @ts-expect-error runtime rng is internal; authored reducers use random helpers.
              const rng = runtime.rng;
              void rng;
            };
            void cardId;
            void assertReduceRuntimeShape;
            return accept(state);
          },
        }),
      },
    });

    expect(Object.keys(phase.interactions ?? {})).toEqual(["choose"]);
    expect(contract.phaseNames).toEqual(["play"]);
  });
});
