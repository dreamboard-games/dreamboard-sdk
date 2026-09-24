import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createGame } from "../../reducer";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "../model";

function createModel() {
  const playerIds = ["player-1", "player-2"] as const;
  const phaseNames = ["play"] as const;
  const cardIds = ["card-1", "card-2"] as const;
  const handIds = ["hand"] as const;
  const emptyIds = [] as const;
  const literalIds = createManifestStringLiteralSchema;
  return {
    manifest: {
      literals: {
        playerIds,
        phaseNames,
        boardLayouts: emptyIds,
        cardSetIds: ["cards"] as const,
        cardTypes: ["action"] as const,
        deckIds: emptyIds,
        handIds,
        sharedZoneIds: emptyIds,
        playerZoneIds: handIds,
        zoneIds: handIds,
        cardIds,
        resourceIds: emptyIds,
        pieceTypeIds: emptyIds,
        pieceIds: emptyIds,
        dieTypeIds: emptyIds,
        dieIds: emptyIds,
        boardTemplateIds: emptyIds,
        boardTypeIds: emptyIds,
        boardBaseIds: emptyIds,
        boardIds: emptyIds,
        boardContainerIds: emptyIds,
        relationTypeIds: emptyIds,
        edgeIds: emptyIds,
        edgeTypeIds: emptyIds,
        vertexIds: emptyIds,
        vertexTypeIds: emptyIds,
        spaceIds: emptyIds,
        spaceTypeIds: emptyIds,
        handVisibilityById: { hand: "ownerOnly" } as const,
        zoneVisibilityById: { hand: "ownerOnly" } as const,
        cardSetIdByCardId: { "card-1": "cards", "card-2": "cards" },
        cardTypeByCardId: { "card-1": "action", "card-2": "action" },
        cardSetIdsBySharedZoneId: {},
        cardSetIdsByPlayerZoneId: { hand: ["cards"] },
      },
      ids: {
        playerId: literalIds(playerIds),
        phaseName: literalIds(phaseNames),
        boardLayout: z.never(),
        cardSetId: literalIds(["cards"] as const),
        cardType: literalIds(["action"] as const),
        cardId: literalIds(cardIds),
        deckId: z.never(),
        handId: literalIds(handIds),
        sharedZoneId: z.never(),
        playerZoneId: literalIds(handIds),
        zoneId: literalIds(handIds),
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
        hands: () => ({ hand: Object.fromEntries([].map((id) => [id, []])) }),
        handVisibility: () => ({}),
        ownerOfCard: () => ({}),
        visibility: () => ({}),
        resources: () => Object.fromEntries([].map((id) => [id, {}])),
      },
      tableSchema: z.custom<RuntimeTableRecord>(),
      runtimeSchema: z.any(),
      createGameStateSchema: () => z.any(),
    },
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: { play: z.object({}) },
    errors: { NOPE: "Not allowed." },
  };
}

describe("createGame", () => {
  test("phantom `types` throws on any runtime read", () => {
    const game = createGame(createModel());
    const play = game.phase("play");
    expect(
      () =>
        (
          game.types as {
            State: unknown;
          }
        ).State,
    ).toThrow(/compile-time carrier/);
    expect(
      () =>
        (
          play.types as {
            State: unknown;
          }
        ).State,
    ).toThrow(/compile-time carrier/);
  });

  test("fused card input builds a card collector with the declared zones", () => {
    const play = createGame(createModel()).phase("play");
    const fused = play.inputs.card({
      from: ["hand"],
      where: {
        id: "only-first",
        errorCode: "NOPE",
        test: ({ targetId }) => targetId === "card-1",
      },
    });
    expect(fused.kind).toBe("card");
    expect(fused.meta).toEqual({
      zoneId: "hand",
      zoneIds: ["hand"],
      targetKind: "card",
    });
    expect(typeof fused.eligibleTargets).toBe("function");
    expect(typeof fused.validateTarget).toBe("function");
  });

  test("assemble is the bound assembler", () => {
    const game = createGame(createModel());
    const definition = game.assemble({
      initialPhase: "play",
      phases: {
        play: game.phase("play").define({
          kind: "auto",
          initialState: () => ({}),
        }),
      },
      view: () => ({}),
    });
    expect(definition.contract).toBe(game.contract);
    expect(Object.keys(definition.phases)).toEqual(["play"]);
  });
});
