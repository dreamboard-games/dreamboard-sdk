import { createGame } from "../reducer";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "../reducer/model";

function buildMinimalManifest() {
  const playerIds = ["player-1", "player-2"] as const;
  return {
    literals: {
      playerIds,
      phaseNames: [] as readonly string[],
      cardSetIds: [] as const,
      cardTypes: [] as const,
      deckIds: [] as const,
      handIds: [] as const,
      sharedZoneIds: [] as const,
      playerZoneIds: [] as const,
      zoneIds: [] as const,
      cardIds: [] as const,
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
      handVisibilityById: {},
      zoneVisibilityById: {},
      cardSetIdByCardId: {},
      cardTypeByCardId: {},
      cardSetIdsBySharedZoneId: {},
      cardSetIdsByPlayerZoneId: {},
    },
    ids: {
      playerId: createManifestStringLiteralSchema(playerIds),
      phaseName: z.string(),
      cardSetId: createManifestStringLiteralSchema([] as const),
      cardType: createManifestStringLiteralSchema([] as const),
      cardId: createManifestStringLiteralSchema([] as const),
      deckId: createManifestStringLiteralSchema([] as const),
      handId: createManifestStringLiteralSchema([] as const),
      sharedZoneId: createManifestStringLiteralSchema([] as const),
      playerZoneId: createManifestStringLiteralSchema([] as const),
      zoneId: createManifestStringLiteralSchema([] as const),
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
      resources: () => Object.fromEntries([].map((id) => [id, {}])),
    },
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  } as const;
}

function buildContract<const PhaseNames extends readonly string[]>(
  phaseNames: PhaseNames,
) {
  return createGame({
    manifest: buildMinimalManifest(),
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: Object.fromEntries(
      phaseNames.map((phaseName) => [phaseName, z.object({})]),
    ) as { [Name in PhaseNames[number]]: z.ZodObject<Record<string, never>> },
  });
}

const autoPhase = { kind: "auto", initialState: () => ({}) } as const;
const initial = { public: () => ({}), private: () => ({}), hidden: () => ({}) };

describe("game.assemble phase names cross-check", () => {
  test("accepts when declared names match the phases record keys", () => {
    const game = buildContract(["alpha", "beta"] as const);
    expect(() =>
      game.assemble({
        initial,
        view: () => ({}),
        initialPhase: "alpha",
        phases: {
          alpha: game.phase("alpha").define(autoPhase),
          beta: game.phase("beta").define(autoPhase),
        },
      }),
    ).not.toThrow();
  });
  test("throws when the phases record is missing a declared phase", () => {
    const game = buildContract(["alpha", "beta"] as const);
    const alpha = game.phase("alpha").define(autoPhase);
    expect(() =>
      game.assemble({
        initial,
        view: () => ({}),
        initialPhase: "alpha",
        phases: { alpha } as unknown as {
          alpha: typeof alpha;
          beta: typeof alpha;
        },
      }),
    ).toThrow(/missing: \[beta\]/);
  });
  test("throws when the phases record has an undeclared phase", () => {
    const game = buildContract(["alpha"] as const);
    const alpha = game.phase("alpha").define(autoPhase);
    expect(() =>
      game.assemble({
        initial,
        view: () => ({}),
        initialPhase: "alpha",
        phases: { alpha, beta: alpha } as { alpha: typeof alpha },
      }),
    ).toThrow(/extra: \[beta\]/);
  });
  test("throws when initialPhase is not declared", () => {
    const game = buildContract(["alpha"] as const);
    expect(() =>
      game.assemble({
        initial,
        view: () => ({}),
        initialPhase: "ghost" as "alpha",
        phases: { alpha: game.phase("alpha").define(autoPhase) },
      }),
    ).toThrow(/initialPhase 'ghost' is not declared/);
  });
});
