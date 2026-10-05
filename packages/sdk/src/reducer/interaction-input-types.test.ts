import { createGame as createModel } from "../reducer";
import { InteractionSteps } from "./authoring/steps";

import { describe, expect, test } from "vitest";
import { z } from "zod";
import { formInput } from "./inputs";
import { many, PlayerId } from "../reducer";
import { GameStateOf } from "./model";
import {
  createManifestStringLiteralSchema,
  ClientParamsOfInteractionOfDefinition,
  InputKeysWithCollectorKindOfDefinition,
  ReducerManifestContract,
  RuntimeCardData,
  RuntimeRecord,
  RuntimeTableRecord,
} from "../reducer/model";
import { asPlayerId } from "./per-player";
type TestPlayerId = PlayerId;
type TestCardId = "card-1" | "card-2";
type TestPlayerZoneId = "hand" | "in-play" | "discard";
type TestPlayerRecord<Value> = Record<TestPlayerId, Value>;
type TestTable = Omit<
  RuntimeTableRecord,
  "playerOrder" | "cards" | "zones" | "resources"
> & {
  playerOrder: TestPlayerId[];
  cards: Record<TestCardId, RuntimeCardData>;
  zones: Record<TestPlayerZoneId, TestPlayerRecord<TestCardId[]>>;
  resources: TestPlayerRecord<RuntimeRecord>;
};
function testPlayerRecord<Value>(): TestPlayerRecord<Value> {
  return Object.fromEntries([]);
}
function buildContract() {
  const playerIds = [asPlayerId("player-1"), asPlayerId("player-2")];
  const cardIds = ["card-1", "card-2"] as const;
  const playerZoneIds = ["hand", "in-play", "discard"] as const;
  const phaseNames = ["play"] as const;
  const manifest = {
    literals: {
      playerIds,
      phaseNames,
      boardLayouts: [] as const,
      cardSetIds: ["cards"] as const,
      cardTypes: ["action"] as const,
      zoneIds: playerZoneIds,
      cardIds,
      resourceIds: [] as const,
      pieceTypeIds: [] as const,
      pieceIds: [] as const,
      dieTypeIds: [] as const,
      dieIds: [] as const,
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
      cardSetIdByCardId: {
        "card-1": "cards",
        "card-2": "cards",
      },
      cardTypeByCardId: {
        "card-1": "action",
        "card-2": "action",
      },
    },
    ids: {
      playerId: createManifestStringLiteralSchema(playerIds),
      phaseName: createManifestStringLiteralSchema(phaseNames),
      boardLayout: z.never(),
      cardSetId: createManifestStringLiteralSchema(["cards"] as const),
      cardType: createManifestStringLiteralSchema(["action"] as const),
      cardId: createManifestStringLiteralSchema(cardIds),
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
    zoneDefinitions: {
      hand: {
        scope: "perPlayer",
        visibility: "ownerOnly",
        allowedCardSetIds: ["cards"],
      },
      "in-play": {
        scope: "perPlayer",
        visibility: "public",
        allowedCardSetIds: ["cards"],
      },
      discard: {
        scope: "perPlayer",
        visibility: "public",
        allowedCardSetIds: ["cards"],
      },
    } as const,
    defaults: {
      zones: () => ({
        hand: testPlayerRecord<TestCardId[]>(),
        "in-play": testPlayerRecord<TestCardId[]>(),
        discard: testPlayerRecord<TestCardId[]>(),
      }),
      ownerOfCard: () => ({}),
      visibility: () => ({}),
      resources: () => testPlayerRecord<RuntimeRecord>(),
    },
    tableSchema: z.custom<TestTable>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  } satisfies ReducerManifestContract<
    TestTable,
    (typeof phaseNames)[number],
    TestPlayerId,
    TestPlayerZoneId,
    TestCardId
  >;
  return createModel({
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
      void formInput.raw;
      // @ts-expect-error arbitrary Zod schemas are not default-renderable inputs.
      formInput(z.string());
    };
    expect(typeof assertRawFormInputsRejected).toBe("function");
  });
  test("contract-declared error maps type authored rule and reject codes", () => {
    const contract = createModel({
      manifest: buildContract().contract.manifest,
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
    const assertErrorCodeTypes = () => {
      contract.phase("play").rule({
        id: "known-code",
        errorCode: "INSUFFICIENT_RESOURCES",
        validate: () => ({
          errorCode: "INSUFFICIENT_RESOURCES",
        }),
      });
      contract.phase("play").rule({
        id: "framework-code",
        errorCode: "NOT_YOUR_TURN",
      });
      contract.phase("play").rule({
        id: "typo-code",
        // @ts-expect-error contracts with an errors map reject typo'd rule codes.
        errorCode: "INSUFFICIENT_RESOURCE",
      });
      contract.phase("play").interaction({
        inputs: {},
        rules: [
          {
            id: "typo-validation-code",
            errorCode: "INSUFFICIENT_RESOURCES",
            // @ts-expect-error ValidationIssue codes come from the contract error union.
            validate: () => ({
              errorCode: "INSUFFICIENT_RESOURCE",
            }),
          },
        ],
        reduce: ({ tx }) => {
          // @ts-expect-error reject codes come from the contract error union.
          return tx.reject("INSUFFICIENT_RESOURCE");
        },
      });
    };
    expect(typeof assertErrorCodeTypes).toBe("function");
    type State = GameStateOf<typeof contract.contract>;
    const assertStateExtraction = (state: State) => {
      const publicState: object = state.publicState;
      const phaseState: object = state.phase;
      return { publicState, phaseState };
    };
    expect(typeof assertStateExtraction).toBe("function");
    expect(contract.contract.errors?.INSUFFICIENT_RESOURCES).toBe(
      "Cannot afford that action.",
    );
  });
  test("types playerId and form cardId from manifest schemas", () => {
    const contract = buildContract();
    const interaction = contract.phase("play").interaction({
      inputs: {
        cardId: formInput(contract.contract.schemas.cardId),
        cardType: formInput(contract.contract.manifest.ids.cardType),
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
      reduce({ input, tx }) {
        const playerId: TestPlayerId = input.playerId;
        const cardId: TestCardId = input.params.cardId;
        tx.moveComponentToZone({
          componentId: cardId,
          to: { zoneId: "in-play", hostId: playerId },
        });
        return;
      },
    });
    expect(Object.keys(interaction.inputs)).toEqual(["cardId", "cardType"]);
  });
  test("state-bound formInput helpers type dynamic choice context", () => {
    type TestGameState = {
      table: TestTable;
      flow: {
        currentPhase: "play";
        activePlayers: TestPlayerId[];
      };
    };
    const input = formInput.forState<TestGameState>();
    const selectedCards = input.choiceList<TestCardId>({
      choices: ({ q, playerId }) =>
        q
          .zone("hand", playerId)
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
  test("types interaction playerId and explicit cardId from manifest schemas", () => {
    const contract = buildContract();
    const action = contract.phase("play").interaction({
      inputs: { cardId: formInput(contract.contract.schemas.cardId) },
      reduce({ input, tx }) {
        const playerId: TestPlayerId = input.playerId;
        const cardId: TestCardId = input.params.cardId;
        tx.moveComponentToZone({
          componentId: cardId,
          to: { zoneId: "in-play", hostId: playerId },
        });
        return;
      },
    });
    expect(action.inputs.cardId).toBeDefined();
    expect(contract.contract.phaseNames).toEqual(["play"]);
  });
  test("types many collectors as readonly arrays of base input values", () => {
    const contract = buildContract();
    const interaction = contract.phase("play").interaction({
      inputs: {
        cardIds: many(formInput(contract.contract.schemas.cardId), {
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
      reduce({ input }) {
        const cardIds: readonly TestCardId[] = input.params.cardIds;
        void cardIds;
        return;
      },
    });
    const assertManyCommitTypes = () => {
      // @ts-expect-error many(...) inputs are explicit draft selections and cannot auto-submit.
      contract.phase("play").interaction({
        commit: { mode: "autoWhenReady" },
        inputs: {
          cardIds: many(formInput(contract.contract.schemas.cardId), {
            count: 2,
            distinct: true,
          }),
        },
        reduce: () => {},
      });
      // @ts-expect-error many(...) card action inputs cannot auto-submit.
      contract.phase("play").interaction({
        inputs: {
          cardId: formInput(contract.contract.schemas.cardId),
          cardIds: many(formInput(contract.contract.schemas.cardId), {
            count: 2,
            distinct: true,
          }),
        },
        commit: { mode: "autoWhenReady" },
        reduce: () => {},
      });
    };
    expect(Object.keys(interaction.inputs)).toEqual(["cardIds"]);
    expect(typeof assertManyCommitTypes).toBe("function");
  });
  test("types simultaneous submit params with precise input keys", () => {
    const contract = buildContract();
    const play = contract.phase("play").define({
      kind: "simultaneousPlayer",
      actors: () => ["player-1", "player-2"] as TestPlayerId[],
      submit: {
        inputs: {
          cardIds: many(formInput(contract.contract.schemas.cardId), {
            count: 2,
            distinct: true,
          }),
        },
      },
      resolve: () => {},
    });
    const game = contract.assemble({
      view: contract.view(() => ({})),
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
      contract.phase("play").define({
        kind: "simultaneousPlayer",
        actors: () => ["player-1", "player-2"] as TestPlayerId[],
        submit: {
          // @ts-expect-error many(...) simultaneous submit inputs are explicit draft selections and cannot auto-submit.
          commit: { mode: "autoWhenReady" },
          inputs: {
            cardIds: many(formInput(contract.contract.schemas.cardId), {
              count: 2,
              distinct: true,
            }),
          },
        },
        resolve: () => {},
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
    const play = contract.phase("play").define({
      kind: "player",
      initialState: () => ({}),
      interactions: {
        chooseCard: contract.phase("play").interaction({
          inputs: {
            cardId: formInput(contract.contract.schemas.cardId),
          },
          reduce: () => {},
        }),
      },
    });
    const game = contract.assemble({
      view: contract.view(() => ({})),
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
  test("step factories expose earlier selections only", () => {
    const steps = new InteractionSteps()
      .input(
        "space",
        formInput.choice({
          choices: [{ value: "hex-a", label: "Hex A" }],
          defaultValue: () => undefined,
        }),
      )
      .input("answer", ({ selected }) =>
        formInput.choice({
          choices: [{ value: selected.space, label: selected.space }],
          defaultValue: () => undefined,
        }),
      );
    expect(steps.entries.map((entry) => entry.key)).toEqual([
      "space",
      "answer",
    ]);
  });
  test("types mutation random helper without exposing runtime rng", () => {
    const contract = buildContract();
    const phase = contract.phase("play").define({
      kind: "player",
      initialState: () => ({}),
      enter({ random, runtime }) {
        const dieResult: number = random.integer({
          minInclusive: 1,
          maxInclusive: 6,
        });
        const selected = random.subset({
          from: ["card-1", "card-2"] as const,
          count: 1,
        });
        const cardId: TestCardId = selected[0];
        const assertEnterRuntimeShape = () => {
          // @ts-expect-error runtime rng is internal; authored mutation callbacks use random helpers.
          void runtime.rng;
        };
        void dieResult;
        void cardId;
        void assertEnterRuntimeShape;
        return;
      },
      interactions: {
        choose: contract.phase("play").interaction({
          inputs: {},
          reduce({ random, runtime }) {
            const signedResult: number = random.integer({
              minInclusive: -2,
              maxInclusive: 2,
            });
            const selected = random.subset({
              from: ["card-1", "card-2"] as const,
              count: 1,
            });
            const cardId: TestCardId = selected[0];
            const assertReduceRuntimeShape = () => {
              // @ts-expect-error runtime rng is internal; authored reducers use random helpers.
              void runtime.rng;
            };
            void signedResult;
            void cardId;
            void assertReduceRuntimeShape;
            return;
          },
        }),
      },
    });
    expect(Object.keys(phase.interactions ?? {})).toEqual(["choose"]);
    expect(contract.contract.phaseNames).toEqual(["play"]);
  });
});
