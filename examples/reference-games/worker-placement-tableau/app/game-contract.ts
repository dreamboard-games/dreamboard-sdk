import { z } from "zod";
import {
  defineGameContract,
  sparseCounts,
  type GameOutcome,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";
import {
  ids,
  manifestContract,
  type PlayerId,
} from "../shared/manifest-contract";

export const itemTypeSchema = z.enum([
  "timberFrame",
  "stoneRelief",
  "joinedMosaic",
]);
export const resourceMapSchema = sparseCounts(ids.resourceId);
export const tableauSchema = z.record(
  ids.playerId,
  z.partialRecord(ids.spaceId, itemTypeSchema),
);
export const gameEventSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("workerPlaced"),
    season: z.number().int().min(1).max(4),
    playerId: ids.playerId,
    workerId: ids.pieceId,
    spaceId: ids.spaceId,
  }),
  z.object({
    kind: z.literal("resourcesGained"),
    season: z.number().int().min(1).max(4),
    playerId: ids.playerId,
    amounts: resourceMapSchema,
  }),
  z.object({
    kind: z.literal("resourcesExchanged"),
    season: z.number().int().min(1).max(4),
    playerId: ids.playerId,
    give: resourceMapSchema,
    receive: resourceMapSchema,
  }),
  z.object({
    kind: z.literal("itemCrafted"),
    season: z.number().int().min(1).max(4),
    playerId: ids.playerId,
    itemType: itemTypeSchema,
    cellId: ids.spaceId,
  }),
  z.object({
    kind: z.literal("playerPassed"),
    season: z.number().int().min(1).max(4),
    playerId: ids.playerId,
  }),
  z.object({
    kind: z.literal("seasonCompleted"),
    completedSeason: z.number().int().min(1).max(4),
    nextSeason: z.number().int().min(2).max(4).nullable(),
  }),
]);

export const publicStateSchema = z.object({
  season: z.number().int().min(1).max(4),
  firstPlayerId: ids.playerId,
  activePlayerId: ids.playerId.nullable(),
  passedPlayerIds: z.array(ids.playerId),
  workerLocations: z.record(ids.pieceId, ids.spaceId.nullable()),
  tableauByPlayer: tableauSchema,
  events: z.array(gameEventSchema),
  finalScoreByPlayer: z.record(ids.playerId, z.number().int()).nullable(),
  outcome: z.custom<GameOutcome<PlayerId>>().nullable(),
});

export const setupPhaseStateSchema = z.object({});
export const placementPhaseStateSchema = z.object({});
export const cleanupPhaseStateSchema = z.object({});
export const scoringPhaseStateSchema = z.object({});
export const gameOverPhaseStateSchema = z.object({});
export const privateStateSchema = z.object({});
export const hiddenStateSchema = z.object({});

export const gameContract = defineGameContract({
  manifest: manifestContract,
  state: {
    public: publicStateSchema,
    private: privateStateSchema,
    hidden: hiddenStateSchema,
  },
  phases: {
    setup: setupPhaseStateSchema,
    placement: placementPhaseStateSchema,
    cleanup: cleanupPhaseStateSchema,
    scoring: scoringPhaseStateSchema,
    gameOver: gameOverPhaseStateSchema,
  },
  errors: {
    INVALID_PLACEMENT:
      "Choose an unused worker and a legal action-space payload.",
    INVALID_EXCHANGE:
      "Exchange one or two affordable resources for an equal, disjoint total.",
    INVALID_CRAFT: "Choose an affordable item and a legal empty workshop cell.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type ItemType = z.infer<typeof itemTypeSchema>;
export type ResourceMap = z.infer<typeof resourceMapSchema>;
export type GameEvent = z.infer<typeof gameEventSchema>;
