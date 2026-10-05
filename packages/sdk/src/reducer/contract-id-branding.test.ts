import { describe, expect, test } from "vitest";
import { z } from "zod";
import { defineGameContract } from "./authoring/contract";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "../reducer/model";

function buildMinimalManifest() {
  const playerIds = ["player-1", "player-2"] as const;
  const cardIds = ["c-alpha", "c-beta"] as const;
  const zoneIds = ["hand", "discard"] as const;
  return {
    literals: {
      tileTypeIds: [] as const,
      tileIds: [] as const,
      boardLayouts: [] as const,
      boardTypeIds: [] as const,
      relationTypeIds: [] as const,
      playerIds,
      phaseNames: ["phase-1"] as const,
      cardSetIds: ["deck-set"] as const,
      cardTypes: ["standard"] as const,
      zoneIds,
      cardIds,
      resourceIds: [] as const,
      pieceTypeIds: [] as const,
      pieceIds: [] as const,
      dieTypeIds: [] as const,
      dieIds: [] as const,
      boardBaseIds: [] as const,
      boardIds: [] as const,
      edgeIds: [] as const,
      edgeTypeIds: [] as const,
      vertexIds: [] as const,
      vertexTypeIds: [] as const,
      spaceIds: [] as const,
      spaceTypeIds: [] as const,
      cardSetIdByCardId: {},
      cardTypeByCardId: {},
    },
    ids: {
      tileTypeId: z.never(),
      tileId: z.never(),
      boardLayout: z.enum(["hex", "square", "network", "track"]),
      playerId: createManifestStringLiteralSchema(playerIds),
      phaseName: z.enum(["phase-1"] as const),
      cardSetId: createManifestStringLiteralSchema(["deck-set"] as const),
      cardType: createManifestStringLiteralSchema(["standard"] as const),
      cardId: createManifestStringLiteralSchema(cardIds),
      zoneId: createManifestStringLiteralSchema(zoneIds),
      resourceId: createManifestStringLiteralSchema([] as const),
      pieceTypeId: createManifestStringLiteralSchema([] as const),
      pieceId: createManifestStringLiteralSchema([] as const),
      dieTypeId: createManifestStringLiteralSchema([] as const),
      dieId: createManifestStringLiteralSchema([] as const),
      boardTypeId: createManifestStringLiteralSchema([] as const),
      boardBaseId: createManifestStringLiteralSchema([] as const),
      boardId: createManifestStringLiteralSchema([] as const),
      relationTypeId: createManifestStringLiteralSchema([] as const),
      edgeId: createManifestStringLiteralSchema([] as const),
      edgeTypeId: createManifestStringLiteralSchema([] as const),
      vertexId: createManifestStringLiteralSchema([] as const),
      vertexTypeId: createManifestStringLiteralSchema([] as const),
      spaceId: createManifestStringLiteralSchema([] as const),
      spaceTypeId: createManifestStringLiteralSchema([] as const),
    },
    zoneDefinitions: {
      hand: {
        scope: "perPlayer",
        visibility: "ownerOnly",
        allowedCardSetIds: ["deck-set"],
      },
      discard: {
        scope: "shared",
        visibility: "public",
        allowedCardSetIds: ["deck-set"],
      },
    } as const,
    defaults: {
      zones: () => ({}),
      ownerOfCard: () => ({}),
      visibility: () => ({}),
      resources: () => Object.fromEntries([].map((id) => [id, {}])),
    },
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
