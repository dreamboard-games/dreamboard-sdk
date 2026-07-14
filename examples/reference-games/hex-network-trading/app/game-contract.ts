import {
  defineGameContract,
  sparseCounts,
  type ErrorCodeOfContract,
  type GameOutcome,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
import { ids, manifestContract } from "../shared/manifest-contract";
import type {
  PlayerId,
  ResourceId,
  SpaceId,
  VertexId,
} from "../shared/manifest-contract";

export const resourceCountsSchema = sparseCounts(ids.resourceId);

export const setupProgressSchema = z.object({
  playerIndex: z.number().int().min(0).max(2),
  pendingIntersectionId: ids.vertexId.nullable(),
});

export const rollResultSchema = z.object({
  dice: z.tuple([
    z.number().int().min(1).max(6),
    z.number().int().min(1).max(6),
  ]),
  total: z.number().int().min(2).max(12),
});

export const productionGrantSchema = z.object({
  playerId: ids.playerId,
  resourceId: ids.resourceId,
  count: z.number().int().positive(),
  hexId: ids.spaceId,
});

export const tradeOfferSchema = z.object({
  offerorPlayerId: ids.playerId,
  targetPlayerId: ids.playerId,
  give: resourceCountsSchema,
  want: resourceCountsSchema,
});

export const tradeRecordSchema = tradeOfferSchema.extend({
  result: z.enum(["accepted", "rejected"]),
});

export const historyEntrySchema = z.object({
  turn: z.number().int().positive(),
  kind: z.enum([
    "startingCamp",
    "startingTrail",
    "roll",
    "production",
    "discard",
    "bandits",
    "buildTrail",
    "buildCamp",
    "depotTrade",
    "tradeOffered",
    "tradeAccepted",
    "tradeRejected",
    "endTurn",
  ]),
  actorPlayerId: ids.playerId.nullable(),
  summary: z.string(),
});

export const publicStateSchema = z.object({
  setup: setupProgressSchema.nullable(),
  activePlayerIndex: z.number().int().min(0).max(2),
  turnNumber: z.number().int().positive(),
  lastRoll: rollResultSchema.nullable(),
  lastProduction: z.array(productionGrantSchema),
  discardCountsByPlayerId: z.partialRecord(
    ids.playerId,
    z.number().int().nonnegative(),
  ),
  currentTrade: tradeOfferSchema.nullable(),
  tradeHistory: z.array(tradeRecordSchema),
  lastSteal: z
    .object({
      thiefPlayerId: ids.playerId,
      victimPlayerId: ids.playerId,
    })
    .nullable(),
  history: z.array(historyEntrySchema),
  outcome: z.custom<GameOutcome<PlayerId>>().nullable(),
});

export const privateStateSchema = z.object({
  lastDiscard: resourceCountsSchema.nullable(),
  lastStolenResourceId: ids.resourceId.nullable(),
});

export const hiddenStateSchema = z.object({});
export const stormtrailPhaseSchema = z.object({
  requiredByPlayerId: z
    .partialRecord(ids.playerId, z.number().int().positive())
    .optional(),
  completedPlayerIds: z.array(ids.playerId).optional(),
});

export const gameContract = defineGameContract({
  manifest: manifestContract,
  state: {
    public: publicStateSchema,
    private: privateStateSchema,
    hidden: hiddenStateSchema,
  },
  phases: {
    setupCamp: stormtrailPhaseSchema,
    setupTrail: stormtrailPhaseSchema,
    roll: stormtrailPhaseSchema,
    discardBarrier: stormtrailPhaseSchema,
    moveBandits: stormtrailPhaseSchema,
    main: stormtrailPhaseSchema,
    pendingTrade: stormtrailPhaseSchema,
    gameOver: stormtrailPhaseSchema,
  },
  errors: {
    BANDITS_DESTINATION_REQUIRED: "Choose a different Bandits destination.",
    CAMP_NOT_CONNECTED: "Build the camp beside one of your trails.",
    CAMP_PIECES_EXHAUSTED: "You have placed all four camps.",
    DISCARD_COUNT_INCORRECT:
      "Discard exactly half your supplies, rounded down.",
    EDGE_OCCUPIED: "That edge already has a trail.",
    GIVE_AND_WANT_OVERLAP: "A resource cannot be both offered and requested.",
    INSUFFICIENT_RESOURCES: "You cannot afford that action.",
    INVALID_DEPOT_TRADE:
      "Return exactly three matching supplies for one different supply.",
    INVALID_TRADE_OFFER: "Offer and request at least one positive supply.",
    NOT_REQUIRED_TO_DISCARD: "This crew has no discard obligation.",
    SETUP_CAMP_OCCUPIED: "That intersection already has a camp.",
    SETUP_TRAIL_NOT_ADJACENT:
      "The starting trail must touch the camp just placed.",
    STEAL_TARGET_FORBIDDEN:
      "Omit a target when no adjacent opponent can be robbed.",
    STEAL_TARGET_REQUIRED:
      "Choose an adjacent opponent with at least one supply.",
    TRADE_OFFER_STALE: "The offeror can no longer pay the offered supplies.",
    TRADE_TARGET_CANNOT_PAY: "The target cannot pay the requested supplies.",
    TRADE_TARGET_INVALID: "Choose exactly one other crew.",
    TRAIL_NOT_CONNECTED: "Connect the new trail to your existing network.",
    TRAIL_PIECES_EXHAUSTED: "You have placed all ten trails.",
    VERTEX_OCCUPIED: "That intersection already has a camp.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type GameErrorCode = ErrorCodeOfContract<GameContract>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type PrivateState = z.infer<typeof privateStateSchema>;
export type ResourceCounts = z.infer<typeof resourceCountsSchema>;
export type TradeOffer = z.infer<typeof tradeOfferSchema>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
export type StormtrailPlayerId = PlayerId;
export type StormtrailResourceId = ResourceId;
export type StormtrailHexId = SpaceId;
export type IntersectionId = VertexId;
