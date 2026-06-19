import { z } from "zod";
import {
  defineGameContract,
  type GameOutcome,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";
import { ids, manifestContract } from "../shared/manifest-contract";

const scoreComponentSchema = z.object({
  id: z.enum([
    "stall-prestige",
    "guild-sets",
    "coin-bonus",
    "complete-sets",
    "coins",
  ]),
  label: z.string(),
  value: z.number(),
});

const standingSchema = z.object({
  playerId: ids.playerId,
  rank: z.number().int().min(1),
  result: z.enum(["win", "draw", "loss", "eliminated"]),
  score: z.number().optional(),
  scoreBreakdown: z.array(scoreComponentSchema).optional(),
  tieBreaks: z.array(scoreComponentSchema).optional(),
});

export const harborOutcomeSchema = z.object({
  reason: z.object({
    code: z.enum(["SIX_ROUNDS_COMPLETE", "FESTIVAL_CANCELLED"]),
    message: z.string().optional(),
  }),
  standings: z.array(standingSchema),
}) satisfies z.ZodType<GameOutcome<string>>;

const festivalRowsSchema = z
  .partialRecord(ids.playerId, z.array(ids.cardId))
  .default({});

const eventSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("stall-drafted"),
    playerId: ids.playerId,
    cardId: ids.cardId,
    round: z.number().int().min(1),
  }),
  z.object({
    kind: z.literal("storm-revealed"),
    stormId: ids.cardId,
    stormsRevealed: z.number().int().min(1),
  }),
  z.object({
    kind: z.literal("festival-scored"),
    round: z.number().int().min(1),
  }),
]);

export const publicStateSchema = z.object({
  round: z.number().int().min(1).max(6),
  activePlayerIndex: z.number().int().min(0),
  playerIds: z.array(ids.playerId).min(2).max(4),
  market: z.array(ids.cardId),
  deck: z.array(ids.cardId),
  festivalRows: festivalRowsSchema,
  stormsRevealed: z.number().int().min(0).max(2),
  events: z.array(eventSchema),
  completed: z.boolean(),
  outcome: harborOutcomeSchema.nullable(),
});

export const privateStateSchema = z.object({});
export const hiddenStateSchema = z.object({});

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
    CARD_NOT_AVAILABLE: "Choose one face-up stall card from the market.",
    PHASE_NOT_DRAFTING: "Stall cards can only be drafted before the fair ends.",
    PLAYER_NOT_ACTIVE: "Players draft from the market in seat order.",
    UNKNOWN_CARD: "The selected market card does not exist.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type HarborPublicState = z.infer<typeof publicStateSchema>;
export type HarborOutcome = z.infer<typeof harborOutcomeSchema>;
export type HarborStanding = z.infer<typeof standingSchema>;
export type ScoreComponent = z.infer<typeof scoreComponentSchema>;
export type DraftingPhaseState = z.infer<typeof draftingPhaseStateSchema>;
