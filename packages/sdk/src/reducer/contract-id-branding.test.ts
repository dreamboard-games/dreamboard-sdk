import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { defineGameContract } from "../reducer";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "../reducer/advanced";
import { perPlayer } from "./per-player";

function buildMinimalManifest() {
  const playerIds = ["player-1", "player-2"] as const;
  const cardIds = ["c-alpha", "c-beta"] as const;
  const zoneIds = ["hand", "discard"] as const;
  return {
    literals: {
      playerIds,
      phases: { "phase-1": z.object({}) },
      setupOptionIds: [] as const,
      setupProfileIds: [] as const,
      cardSetIds: ["deck-set"] as const,
      cardTypes: ["standard"] as const,
      deckIds: ["deck"] as const,
      handIds: ["hand"] as const,
      sharedZoneIds: ["discard"] as const,
      playerZoneIds: ["hand"] as const,
      zoneIds,
      cardIds,
      resourceIds: [] as const,
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
      handVisibilityById: { hand: "ownerOnly" } as const,
      zoneVisibilityById: { hand: "ownerOnly", discard: "public" } as const,
      cardSetIdByCardId: {},
      cardTypeByCardId: {},
      cardSetIdsBySharedZoneId: {},
      cardSetIdsByPlayerZoneId: {},
    },
    ids: {
      playerId: createManifestStringLiteralSchema(playerIds),
      phaseName: z.enum(["phase-1"] as const),
      setupOptionId: createManifestStringLiteralSchema([] as const),
      setupProfileId: createManifestStringLiteralSchema([] as const),
      cardSetId: createManifestStringLiteralSchema(["deck-set"] as const),
      cardType: createManifestStringLiteralSchema(["standard"] as const),
      cardId: createManifestStringLiteralSchema(cardIds),
      deckId: createManifestStringLiteralSchema(["deck"] as const),
      handId: createManifestStringLiteralSchema(["hand"] as const),
      sharedZoneId: createManifestStringLiteralSchema(["discard"] as const),
      playerZoneId: createManifestStringLiteralSchema(["hand"] as const),
      zoneId: createManifestStringLiteralSchema(zoneIds),
      resourceId: createManifestStringLiteralSchema([] as const),
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

describe("defineGameContract id branding validation", () => {
  test("accepts state schemas that use manifest.ids.* branded schemas", () => {
    const manifest = buildMinimalManifest();
    expect(() =>
      defineGameContract({
        manifest,
        phases: { "phase-1": z.object({}) },
        state: {
          public: z.object({
            knowerPlayerId: manifest.ids.playerId,
            pendingCardId: manifest.ids.cardId.nullable(),
            activeZoneIds: z.array(manifest.ids.zoneId),
            description: z.string(),
          }),
          private: z.object({
            hiddenPlayerId: manifest.ids.playerId.optional(),
          }),
          hidden: z.object({}),
        },
      }),
    ).not.toThrow();
  });

  test("rejects a top-level field named as a manifest id that uses raw z.string()", () => {
    const manifest = buildMinimalManifest();
    expect(() =>
      defineGameContract({
        manifest,
        phases: { "phase-1": z.object({}) },
        state: {
          public: z.object({
            currentPlayerId: z.string(),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      }),
    ).toThrow(/state\.public\.currentPlayerId/);
  });

  test("rejects a nullable raw string for a manifest id field", () => {
    const manifest = buildMinimalManifest();
    expect(() =>
      defineGameContract({
        manifest,
        phases: { "phase-1": z.object({}) },
        state: {
          public: z.object({
            pendingCardId: z.string().nullable(),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      }),
    ).toThrow(/pendingCardId/);
  });

  test("rejects z.array(z.string()) when the field name is a plural manifest id", () => {
    const manifest = buildMinimalManifest();
    expect(() =>
      defineGameContract({
        manifest,
        phases: { "phase-1": z.object({}) },
        state: {
          public: z.object({
            cardIds: z.array(z.string()),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      }),
    ).toThrow(/cardIds/);
  });

  test("allows raw z.string() for fields that are not manifest-scoped ids", () => {
    const manifest = buildMinimalManifest();
    expect(() =>
      defineGameContract({
        manifest,
        phases: { "phase-1": z.object({}) },
        state: {
          public: z.object({
            winnerReason: z.string().nullable(),
            description: z.string(),
            seed: z.number(),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      }),
    ).not.toThrow();
  });

  test("rejects a field whose suffix matches a manifest id (e.g. knowerPlayerId)", () => {
    const manifest = buildMinimalManifest();
    expect(() =>
      defineGameContract({
        manifest,
        phases: { "phase-1": z.object({}) },
        state: {
          public: z.object({
            knowerPlayerId: z.string(),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      }),
    ).toThrow(/knowerPlayerId/);
  });
});
