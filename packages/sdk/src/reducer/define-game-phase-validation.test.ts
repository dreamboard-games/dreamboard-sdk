import { defineGameDefinition as defineGame } from "./authoring/game";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { defineGameContract, definePhase } from "../reducer";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "../reducer/advanced";
import { perPlayer } from "./per-player";

function buildMinimalManifest() {
  const playerIds = ["player-1", "player-2"] as const;
  return {
    literals: {
      playerIds,
      phaseNames: [] as readonly string[],
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

function buildContract<const PhaseNames extends readonly string[]>(
  phaseNames: PhaseNames,
) {
  return defineGameContract({
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

const autoPhase = <Contract>() =>
  definePhase<Contract>()({
    kind: "auto",
    state: z.object({}),
    initialState: () => ({}),
  });

describe("defineGame phaseNames / phases cross-check", () => {
  test("accepts when contract.phaseNames matches the phases record keys", () => {
    const contract = buildContract(["alpha", "beta"] as const);
    expect(() =>
      defineGame({
        contract,
        initialPhase: "alpha",
        phases: {
          alpha: autoPhase<typeof contract>(),
          beta: autoPhase<typeof contract>(),
        },
      }),
    ).not.toThrow();
  });

  test("throws when the phases record is missing a declared phase name", () => {
    const contract = buildContract(["alpha", "beta"] as const);
    expect(() =>
      defineGame({
        contract,
        initialPhase: "alpha",
        phases: {
          alpha: autoPhase<typeof contract>(),
        } as unknown as Record<
          "alpha" | "beta",
          ReturnType<typeof autoPhase<typeof contract>>
        >,
      }),
    ).toThrow(/missing: \[beta\]/);
  });

  test("throws when the phases record has an extra undeclared phase name", () => {
    const contract = buildContract(["alpha"] as const);
    expect(() =>
      defineGame({
        contract,
        initialPhase: "alpha",
        phases: {
          alpha: autoPhase<typeof contract>(),
          beta: autoPhase<typeof contract>(),
        } as unknown as Record<
          "alpha",
          ReturnType<typeof autoPhase<typeof contract>>
        >,
      }),
    ).toThrow(/extra: \[beta\]/);
  });

  test("throws when initialPhase is not in contract.phaseNames", () => {
    const contract = buildContract(["alpha"] as const);
    expect(() =>
      defineGame({
        contract,
        initialPhase: "ghost" as "alpha",
        phases: {
          alpha: autoPhase<typeof contract>(),
        },
      }),
    ).toThrow(/initialPhase 'ghost' is not declared/);
  });

  test("throws when setupProfiles[*].initialPhase is not in contract.phaseNames", () => {
    const contract = buildContract(["alpha"] as const);
    expect(() =>
      defineGame({
        contract,
        initialPhase: "alpha",
        setupProfiles: {
          profileA: {
            initialPhase: "ghost" as "alpha",
          },
        },
        phases: {
          alpha: autoPhase<typeof contract>(),
        },
      }),
    ).toThrow(/setupProfiles.profileA.initialPhase 'ghost' is not declared/);
  });
});
