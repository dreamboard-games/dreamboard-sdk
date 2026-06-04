import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  defineEffect,
  defineGame,
  defineGameContract,
  defineInteraction,
  definePhase,
  definePhaseStage,
} from "../../authoring";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "../../model";
import { perPlayer } from "../../per-player";
import { collectTrustedRuntimeRegistry } from "./runtime-registry";

function buildMinimalManifest<const PhaseNames extends readonly string[]>(
  phaseNames: PhaseNames,
) {
  const playerIds = ["player-1", "player-2"] as const;
  const handIds = ["hand"] as const;
  return {
    literals: {
      playerIds,
      phaseNames,
      setupOptionIds: [] as const,
      setupProfileIds: [] as const,
      cardSetIds: [] as const,
      cardTypes: [] as const,
      deckIds: [] as const,
      handIds,
      sharedZoneIds: [] as const,
      playerZoneIds: handIds,
      zoneIds: handIds,
      cardIds: [] as const,
      resourceIds: [] as const,
      pieceTypeIds: [] as const,
      pieceIds: [] as const,
      dieTypeIds: ["d6"] as const,
      dieIds: ["setupDie", "playDie"] as const,
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
      cardTypeByCardId: {},
      cardSetIdsBySharedZoneId: {},
      cardSetIdsByPlayerZoneId: {},
    },
    ids: {
      playerId: createManifestStringLiteralSchema(playerIds),
      phaseName: createManifestStringLiteralSchema(phaseNames),
      setupOptionId: createManifestStringLiteralSchema([] as const),
      setupProfileId: createManifestStringLiteralSchema([] as const),
      cardSetId: createManifestStringLiteralSchema([] as const),
      cardType: createManifestStringLiteralSchema([] as const),
      cardId: createManifestStringLiteralSchema([] as const),
      deckId: createManifestStringLiteralSchema([] as const),
      handId: createManifestStringLiteralSchema(handIds),
      sharedZoneId: createManifestStringLiteralSchema([] as const),
      playerZoneId: createManifestStringLiteralSchema(handIds),
      zoneId: createManifestStringLiteralSchema(handIds),
      resourceId: createManifestStringLiteralSchema([] as const),
      dieTypeId: createManifestStringLiteralSchema(["d6"] as const),
      dieId: createManifestStringLiteralSchema([
        "setupDie",
        "playDie",
      ] as const),
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
  } as const;
}

function buildContract<const PhaseNames extends readonly string[]>(
  phaseNames: PhaseNames,
) {
  return defineGameContract({
    manifest: buildMinimalManifest(phaseNames),
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: Object.fromEntries(
      phaseNames.map((phaseName) => [phaseName, z.object({})]),
    ) as { [Name in PhaseNames[number]]: z.ZodObject<{}> },
  });
}

describe("collectTrustedRuntimeRegistry", () => {
  test("preserves typed phase keys while collecting heterogeneous phase registries", () => {
    const contract = buildContract(["setup", "play"] as const);
    const setupState = z.object({
      selectedFirstPlayer: z.string().nullable(),
    });
    const playState = z.object({
      actionCount: z.number().int(),
    });
    const setupRoll = defineEffect<typeof contract>()({
      type: "rollDie",
      id: "setupRoll",
      reduce: ({ state }) => ({
        type: "accept",
        state,
      }),
    });
    const playRoll = defineEffect<typeof contract>()({
      type: "rollDie",
      id: "playRoll",
    });

    const game = defineGame({
      contract,
      initialPhase: "setup",
      phases: {
        setup: definePhase<typeof contract>()({
          kind: "player",
          state: setupState,
          initialState: () => ({ selectedFirstPlayer: null }),
          effects: {
            setupRoll,
          },
          interactions: {
            chooseFirstPlayer: defineInteraction<
              typeof contract,
              typeof setupState
            >()({
              inputs: {},
              reduce: ({ state }) => ({
                type: "accept",
                state: {
                  ...state,
                  phase: { selectedFirstPlayer: "player-1" },
                },
              }),
            }),
          },
          stages: {
            choosing: definePhaseStage<typeof contract, typeof setupState>()({
              allow: ["chooseFirstPlayer"],
              when: ({ state }) => state.phase.selectedFirstPlayer === null,
            }),
          },
          zones: ["hand"],
        }),
        play: definePhase<typeof contract>()({
          kind: "player",
          state: playState,
          initialState: () => ({ actionCount: 0 }),
          effects: {
            playRoll,
          },
          interactions: {
            takeAction: defineInteraction<typeof contract, typeof playState>()({
              inputs: {},
              reduce: ({ state }) => ({
                type: "accept",
                state: {
                  ...state,
                  phase: { actionCount: state.phase.actionCount + 1 },
                },
              }),
            }),
          },
          stages: {
            acting: definePhaseStage<typeof contract, typeof playState>()({
              allow: ["takeAction"],
              when: ({ state }) => state.phase.actionCount < 2,
            }),
          },
          zones: ["hand"],
        }),
      },
    });

    const registry = collectTrustedRuntimeRegistry(game);
    type PhaseKey = Parameters<typeof registry.phasesByName.get>[0];
    const setupPhaseKey: PhaseKey = "setup";

    expect(setupPhaseKey).toBe("setup");
    // @ts-expect-error phase keys must stay narrowed to "setup" | "play".
    registry.phasesByName.get("scoring");
    expect(registry.phaseEntries.map(([phaseName]) => phaseName)).toEqual([
      "setup",
      "play",
    ]);
    expect(
      registry.phasesByName
        .get("setup")
        ?.interactions.map(([interactionId]) => interactionId),
    ).toEqual(["chooseFirstPlayer"]);
    expect(
      registry.phasesByName.get("play")?.stages.map(([stageId]) => stageId),
    ).toEqual(["acting"]);
    expect(registry.phasesByName.get("setup")?.zones).toEqual(["hand"]);
    expect(registry.continuationsById.has("setupRoll")).toBe(true);
    expect(registry.continuationsById.has("playRoll")).toBe(false);
    expect([...registry.effectsById.keys()]).toEqual(["setupRoll", "playRoll"]);
  });
});
