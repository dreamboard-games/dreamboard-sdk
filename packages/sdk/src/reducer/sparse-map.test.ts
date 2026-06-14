import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  defineGameContract,
  defineInteraction,
  formInput,
  normalizeCommandParams,
  sparseCounts,
  sparseMap,
} from "../reducer";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "../reducer/advanced";
import { perPlayer } from "./per-player";

function buildMinimalManifest() {
  const playerIds = ["player-1", "player-2"] as const;
  const resourceIds = ["brick", "grain", "lumber"] as const;
  return {
    literals: {
      playerIds,
      phases: { "phase-1": z.object({}) },
      setupOptionIds: [] as const,
      setupProfileIds: [] as const,
      cardSetIds: [] as const,
      cardTypes: [] as const,
      deckIds: [] as const,
      handIds: [] as const,
      sharedZoneIds: [] as const,
      playerZoneIds: [] as const,
      zoneIds: [] as const,
      cardIds: [] as const,
      resourceIds,
      pieceTypeIds: [] as const,
      pieceIds: [] as const,
      dieTypeIds: [] as const,
      dieIds: [] as const,
      boardBaseIds: [] as const,
      boardIds: [] as const,
      boardContainerIds: [] as const,
      edgeIds: [] as const,
      edgeTypeIds: [] as const,
      vertexIds: [] as const,
      vertexTypeIds: [] as const,
      spaceIds: [] as const,
      spaceTypeIds: [] as const,
      handVisibilityById: {} as const,
      zoneVisibilityById: {} as const,
      cardSetIdByCardId: {} as const,
      cardTypeByCardId: {} as const,
      cardSetIdsBySharedZoneId: {} as const,
      cardSetIdsByPlayerZoneId: {} as const,
    },
    ids: {
      playerId: createManifestStringLiteralSchema(playerIds),
      phaseName: z.enum(["phase-1"] as const),
      setupOptionId: createManifestStringLiteralSchema([] as const),
      setupProfileId: createManifestStringLiteralSchema([] as const),
      cardSetId: createManifestStringLiteralSchema([] as const),
      cardType: createManifestStringLiteralSchema([] as const),
      cardId: createManifestStringLiteralSchema([] as const),
      deckId: createManifestStringLiteralSchema([] as const),
      handId: createManifestStringLiteralSchema([] as const),
      sharedZoneId: createManifestStringLiteralSchema([] as const),
      playerZoneId: createManifestStringLiteralSchema([] as const),
      zoneId: createManifestStringLiteralSchema([] as const),
      resourceId: createManifestStringLiteralSchema(resourceIds),
      pieceTypeId: createManifestStringLiteralSchema([] as const),
      pieceId: createManifestStringLiteralSchema([] as const),
      dieTypeId: createManifestStringLiteralSchema([] as const),
      dieId: createManifestStringLiteralSchema([] as const),
      boardTypeId: createManifestStringLiteralSchema([] as const),
      boardBaseId: createManifestStringLiteralSchema([] as const),
      boardId: createManifestStringLiteralSchema([] as const),
      boardContainerId: createManifestStringLiteralSchema([] as const),
      relationTypeId: createManifestStringLiteralSchema([] as const),
      edgeId: createManifestStringLiteralSchema([] as const),
      edgeTypeId: createManifestStringLiteralSchema([] as const),
      vertexId: createManifestStringLiteralSchema([] as const),
      vertexTypeId: createManifestStringLiteralSchema([] as const),
      spaceId: createManifestStringLiteralSchema([] as const),
      spaceTypeId: createManifestStringLiteralSchema([] as const),
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
  } as const;
}

describe("sparse map helpers", () => {
  test("sparseCounts accepts sparse enum-keyed payloads and rejects unknown keys", () => {
    const schema = sparseCounts(z.enum(["brick", "grain", "lumber"] as const));

    expect(schema.parse({ lumber: 1 })).toEqual({ lumber: 1 });
    expect(schema.safeParse({ stone: 2 }).success).toBe(false);
  });

  test("normalizeCommandParams filters stray sparse-map keys before parsing", () => {
    const schema = z.object({
      give: sparseCounts(z.enum(["brick", "grain", "lumber"] as const)),
      want: sparseMap(
        z.enum(["brick", "grain", "lumber"] as const),
        z.number().int().min(0),
      ),
      targetPlayerIds: z.array(z.string()),
    });

    const normalized = normalizeCommandParams(schema, {
      give: { lumber: 1, stone: 2 },
      want: { brick: 1, coal: 3 },
      targetPlayerIds: ["player-2"],
    });

    expect(normalized).toEqual({
      give: { lumber: 1 },
      want: { brick: 1 },
      targetPlayerIds: ["player-2"],
    });
  });

  test("defineInteraction rejects raw enum-keyed z.record params and accepts sparse helpers", () => {
    const manifest = buildMinimalManifest();
    const contract = defineGameContract({
      manifest,
      phases: { "phase-1": z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });

    expect(() =>
      defineInteraction<typeof contract>()({
        inputs: {
          give: formInput(
            z.record(
              z.enum(["brick", "grain", "lumber"] as const),
              z.number().int().min(0),
            ),
          ),
        },
        reduce({ state, accept }) {
          return accept(state);
        },
      }),
    ).toThrow(/enum-keyed z\.record/);

    expect(() =>
      defineInteraction<typeof contract>()({
        inputs: {
          give: formInput(
            sparseCounts(z.enum(["brick", "grain", "lumber"] as const)),
          ),
        },
        reduce({ state, accept }) {
          return accept(state);
        },
      }),
    ).not.toThrow();
  });
});
