import {
  defineGameContract,
  type GameOutcome,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
import { ids, manifestContract } from "../shared/manifest-contract";

export const guildSchema = z.enum(["food", "craft", "music"]);
export const stormIdSchema = z.enum(["storm-1", "storm-2"]);
export const outcomeCodeSchema = z.enum([
  "SIX_ROUNDS_COMPLETE",
  "FESTIVAL_CANCELLED",
]);

const scoreComponentSchema = z.object({
  id: z.enum(["stall-prestige", "guild-set-points", "coin-bonus"]),
  label: z.string(),
  value: z.number(),
});

const tieBreakSchema = z.object({
  id: z.enum(["complete-guild-sets", "coins"]),
  label: z.string(),
  value: z.number(),
});

const standingSchema = z.object({
  playerId: ids.playerId,
  rank: z.number().int().min(1),
  result: z.enum(["win", "draw", "loss"]),
  score: z.number().optional(),
  scoreBreakdown: z.array(scoreComponentSchema).optional(),
  tieBreaks: z.array(tieBreakSchema).optional(),
});

export const harborOutcomeSchema = z.object({
  reason: z.object({
    code: outcomeCodeSchema,
    message: z.string().optional(),
  }),
  standings: z.array(standingSchema),
}) satisfies z.ZodType<GameOutcome<string>>;

const festivalRowsSchema = z
  .partialRecord(ids.playerId, z.array(ids.cardId))
  .default({});

export const publicEventSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("stall-drafted"),
    playerId: ids.playerId,
    cardId: ids.cardId,
    round: z.number().int().min(1).max(6),
  }),
  z.object({
    kind: z.literal("market-refilled"),
    cardId: ids.cardId,
    marketIndex: z.number().int().min(0).max(3),
  }),
  z.object({
    kind: z.literal("storm-revealed"),
    stormId: stormIdSchema,
    stormsRevealed: z.number().int().min(1).max(2),
  }),
  z.object({
    kind: z.literal("round-advanced"),
    previousRound: z.number().int().min(1).max(5),
    nextRound: z.number().int().min(2).max(6),
  }),
  z.object({
    kind: z.literal("festival-scored"),
    round: z.literal(6),
  }),
]);

export const publicStateSchema = z.object({
  round: z.number().int().min(1).max(6),
  activePlayerIndex: z.number().int().min(0).max(3),
  playerIds: z.array(ids.playerId).min(2).max(4),
  market: z.array(ids.cardId.nullable()).length(4),
  festivalRows: festivalRowsSchema,
  stormsRevealed: z.number().int().min(0).max(2),
  stormHistory: z.array(stormIdSchema).max(2),
  events: z.array(publicEventSchema),
  completed: z.boolean(),
  outcome: harborOutcomeSchema.nullable(),
});

export const privateStateSchema = z.object({});
export const hiddenStateSchema = z.object({
  festivalDeck: z.array(ids.cardId),
});

export const setupPhaseStateSchema = z.object({});
export const draftingPhaseStateSchema = z.object({});
export const gameOverPhaseStateSchema = z.object({});

export const gameContract = defineGameContract({
  manifest: manifestContract,
  state: {
    public: publicStateSchema,
    private: privateStateSchema,
    hidden: hiddenStateSchema,
  },
  phases: {
    setup: setupPhaseStateSchema,
    drafting: draftingPhaseStateSchema,
    gameOver: gameOverPhaseStateSchema,
  },
  errors: {
    CARD_NOT_AVAILABLE: "Choose a face-up stall currently in the market.",
    PHASE_NOT_DRAFTING: "Stalls can only be drafted before the fair ends.",
    PLAYER_NOT_ACTIVE: "Players draft in fixed session seat order.",
    UNKNOWN_CARD: "The selected card is not a Harbor Fair card.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type HarborPublicState = z.infer<typeof publicStateSchema>;
export type HarborHiddenState = z.infer<typeof hiddenStateSchema>;
export type HarborOutcome = z.infer<typeof harborOutcomeSchema>;
export type HarborStanding = z.infer<typeof standingSchema>;
export type ScoreComponent = z.infer<typeof scoreComponentSchema>;
export type TieBreak = z.infer<typeof tieBreakSchema>;
export type PublicEvent = z.infer<typeof publicEventSchema>;
export type PlayerId = z.infer<typeof ids.playerId>;
export type CardId = z.infer<typeof ids.cardId>;
export type Guild = z.infer<typeof guildSchema>;
export type StormId = z.infer<typeof stormIdSchema>;
