import { z } from "zod";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "./model";
import { asPlayerId } from "./per-player";
export function buildMinimalManifest<
  const PhaseNames extends readonly string[],
>(phaseNames: PhaseNames) {
  const playerIds = ["player-1", "player-2"] as const;
  const handIds = ["hand"] as const;
  return {
    zoneDefinitions: {
      hand: { scope: "perPlayer", visibility: "public", allowedCardSetIds: [] },
    },
    literals: {
      playerIds,
      phaseNames,
      cardSetIds: [] as const,
      cardTypes: [] as const,

      zoneIds: handIds,
      cardIds: [] as const,
      resourceIds: [] as const,
      pieceTypeIds: [] as const,
      pieceIds: [] as const,
      dieTypeIds: ["d6"] as const,
      dieIds: ["setupDie", "playDie"] as const,
      boardBaseIds: [] as const,
      boardIds: [] as const,
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
      cardSetIdByCardId: {},
      cardTypeByCardId: {},
    },
    ids: {
      playerId: createManifestStringLiteralSchema(playerIds),
      phaseName: createManifestStringLiteralSchema(phaseNames),
      cardSetId: createManifestStringLiteralSchema([] as const),
      cardType: createManifestStringLiteralSchema([] as const),
      cardId: createManifestStringLiteralSchema([] as const),
      zoneId: createManifestStringLiteralSchema(handIds),
      resourceId: createManifestStringLiteralSchema([] as const),
      dieTypeId: createManifestStringLiteralSchema(["d6"] as const),
      dieId: createManifestStringLiteralSchema([
        "setupDie",
        "playDie",
      ] as const),
      boardBaseId: createManifestStringLiteralSchema([] as const),
      boardId: createManifestStringLiteralSchema([] as const),
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
      zones: (players: readonly string[] = playerIds) => ({
        hand: Object.fromEntries(players.map((id) => [id, []])),
      }),
      ownerOfCard: () => ({}),
      visibility: () => ({}),
      resources: () => Object.fromEntries([].map((id) => [id, {}])),
    },
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  } as const;
}

export function createTable(
  playerIds = ["player-1", "player-2"],
): RuntimeTableRecord {
  const ids = playerIds.map((id) => asPlayerId(id));
  return {
    playerOrder: [...playerIds],
    zones: { hand: Object.fromEntries(playerIds.map((id) => [id, []])) },

    cards: {},
    pieces: {},
    componentLocations: { "die-1": { type: "Detached" } },
    ownerOfCard: {},
    visibility: {},
    resources: Object.fromEntries(ids.map((id) => [id, {}])),
    boards: {
      byId: {},
      hex: {},
      network: {},
      square: {},
      track: {},
    },
    tiles: {},
    dice: {
      "die-1": {
        id: "die-1",
        dieTypeId: "d6",
        dieName: "Test die",
        sides: 6,
        value: null,
        properties: {},
      },
    },
  };
}
