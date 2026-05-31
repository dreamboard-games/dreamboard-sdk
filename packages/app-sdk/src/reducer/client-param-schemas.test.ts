import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  defineCardAction,
  defineGame,
  defineGameContract,
  defineInteraction,
  definePhase,
  formInput,
  many,
  rngInput,
  type RuntimeTableRecord,
} from "../reducer";
import { createManifestStringLiteralSchema } from "./model";
import { perPlayer } from "./per-player";
import { createClientParamSchemasByPhase } from "./client-param-schemas";

function createContract() {
  const playerIds = ["player-1"] as const;
  const phaseNames = ["setup", "play"] as const;
  const cardIds = ["card-1"] as const;
  const cardTypes = ["play-card"] as const;
  const handIds = ["hand"] as const;
  return defineGameContract({
    manifest: {
      literals: {
        playerIds,
        phaseNames,
        setupOptionIds: [] as const,
        setupProfileIds: [] as const,
        cardSetIds: [] as const,
        cardTypes,
        deckIds: [] as const,
        handIds,
        sharedZoneIds: [] as const,
        playerZoneIds: handIds,
        zoneIds: handIds,
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
        edgeTypeIds: [] as const,
        vertexIds: [] as const,
        vertexTypeIds: [] as const,
        portIds: [] as const,
        portTypeIds: [] as const,
        spaceIds: [] as const,
        spaceTypeIds: [] as const,
        handVisibilityById: {},
        zoneVisibilityById: {},
        cardSetIdByCardId: {},
        cardTypeByCardId: { "card-1": "play-card" },
        cardSetIdsBySharedZoneId: {},
        cardSetIdsByPlayerZoneId: {},
      },
      ids: {
        playerId: createManifestStringLiteralSchema(playerIds),
        phaseName: createManifestStringLiteralSchema(phaseNames),
        setupOptionId: createManifestStringLiteralSchema([] as const),
        setupProfileId: createManifestStringLiteralSchema([] as const),
        cardSetId: createManifestStringLiteralSchema([] as const),
        cardType: createManifestStringLiteralSchema(cardTypes),
        cardId: createManifestStringLiteralSchema(cardIds),
        deckId: createManifestStringLiteralSchema([] as const),
        handId: createManifestStringLiteralSchema(handIds),
        sharedZoneId: createManifestStringLiteralSchema([] as const),
        playerZoneId: createManifestStringLiteralSchema(handIds),
        zoneId: createManifestStringLiteralSchema(handIds),
        resourceId: createManifestStringLiteralSchema([] as const),
        dieTypeId: createManifestStringLiteralSchema([] as const),
        dieId: createManifestStringLiteralSchema([] as const),
        boardBaseId: createManifestStringLiteralSchema([] as const),
        boardId: createManifestStringLiteralSchema([] as const),
        boardContainerId: createManifestStringLiteralSchema([] as const),
        boardTypeId: createManifestStringLiteralSchema([] as const),
        tileId: createManifestStringLiteralSchema([] as const),
        tileTypeId: createManifestStringLiteralSchema([] as const),
        edgeId: createManifestStringLiteralSchema([] as const),
        edgeTypeId: createManifestStringLiteralSchema([] as const),
        vertexId: createManifestStringLiteralSchema([] as const),
        vertexTypeId: createManifestStringLiteralSchema([] as const),
        portId: createManifestStringLiteralSchema([] as const),
        portTypeId: createManifestStringLiteralSchema([] as const),
        spaceId: createManifestStringLiteralSchema([] as const),
        spaceTypeId: createManifestStringLiteralSchema([] as const),
        pieceId: createManifestStringLiteralSchema([] as const),
        pieceTypeId: createManifestStringLiteralSchema([] as const),
        relationTypeId: createManifestStringLiteralSchema([] as const),
      },
      defaults: {
        zones: () => ({ shared: {}, perPlayer: {}, visibility: {} }),
        decks: () => ({}),
        hands: () => ({}),
        handVisibility: () => ({}),
        ownerOfCard: () => ({}),
        visibility: () => ({}),
        resources: () => perPlayer([], () => ({})),
      },
      setupOptionsById: {},
      setupChoiceIdsByOptionId: {},
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
      setup: z.object({}),
      play: z.object({}),
    },
  });
}

describe("createClientParamSchemasByPhase", () => {
  test("derives schemas from registry-materialized authored interactions", () => {
    const contract = createContract();
    const phaseState = z.object({});
    const explicitSchema = z.object({
      explicit: z.literal("schema"),
    });
    const game = defineGame({
      contract,
      initialPhase: "setup",
      phases: {
        setup: definePhase<typeof contract>()({
          kind: "player",
          state: phaseState,
          initialState: () => ({}),
          interactions: {
            choose: defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                count: formInput.number({ min: 0, max: 10 }),
                mode: formInput.choice({
                  choices: [
                    { value: "fast", label: "Fast" },
                    { value: "slow", label: "Slow" },
                  ],
                  defaultValue: "fast",
                }),
                labels: many(
                  formInput.choice({
                    choices: [
                      { value: "a", label: "A" },
                      { value: "b", label: "B" },
                      { value: "c", label: "C" },
                    ],
                    defaultValue: "a",
                  }),
                  {
                    count: 2,
                    distinct: true,
                  },
                ),
                dice: rngInput.d6(2),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
            explicit: defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                ignored: formInput.choice({
                  choices: [{ value: "ignored", label: "Ignored" }],
                  defaultValue: "ignored",
                }),
              },
              paramsSchema: explicitSchema,
              reduce: ({ state, accept }) => accept(state),
            }),
          },
          cardActions: {
            playCard: defineCardAction<typeof contract, typeof phaseState>()({
              cardType: "play-card",
              playFrom: "hand",
              inputs: {
                target: formInput.choice({
                  choices: [{ value: "zone-1", label: "Zone 1" }],
                  defaultValue: "zone-1",
                }),
                sampled: rngInput.d6(),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
          },
        }),
        play: definePhase<typeof contract>()({
          kind: "player",
          state: phaseState,
          initialState: () => ({}),
          interactions: {
            choose: defineInteraction<typeof contract, typeof phaseState>()({
              inputs: {
                label: formInput.choice({
                  choices: [{ value: "ok", label: "OK" }],
                  defaultValue: "ok",
                }),
              },
              reduce: ({ state, accept }) => accept(state),
            }),
          },
        }),
      },
    });

    const schemas = createClientParamSchemasByPhase(game);

    expect(
      schemas.setup?.choose?.safeParse({ count: 1, labels: ["a", "b"] })
        .success,
    ).toBe(true);
    expect(
      schemas.setup?.choose?.safeParse({ count: 1, labels: ["a", "b"] }),
    ).toMatchObject({
      success: true,
      data: { count: 1, labels: ["a", "b"], mode: "fast" },
    });
    expect(
      schemas.setup?.choose?.safeParse({
        count: 1,
        labels: ["a", "b"],
      }).success,
    ).toBe(true);
    expect(
      schemas.setup?.choose?.safeParse({ count: 1, labels: "a" }).success,
    ).toBe(false);
    expect(
      schemas.setup?.choose?.safeParse({ label: "wrong-phase" }).success,
    ).toBe(false);
    expect(schemas.play?.choose?.safeParse({ label: "ok" }).success).toBe(true);
    expect(schemas.play?.choose?.safeParse({ count: 1 }).success).toBe(true);
    expect(
      schemas.setup?.explicit?.safeParse({ explicit: "schema" }).success,
    ).toBe(true);
    expect(
      schemas.setup?.explicit?.safeParse({ ignored: "input" }).success,
    ).toBe(false);
    expect(
      schemas.setup?.playCard?.safeParse({ cardId: "card-1", target: "zone-1" })
        .success,
    ).toBe(true);
    expect(
      schemas.setup?.playCard?.safeParse({ target: "zone-1" }).success,
    ).toBe(false);
  });
});
