import {
  defineGameContract,
  type ErrorCodeOfContract,
  type GameOutcome,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
import { ids, manifestContract } from "../shared/manifest-contract";

export const suitSchema = z.enum(["clubs", "diamonds", "spades", "hearts"]);

export const trickPlaySchema = z.object({
  playerId: ids.playerId,
  cardId: ids.cardId,
});

export const completedTrickSchema = z.object({
  number: z.number().int().min(1).max(13),
  leadSuit: suitSchema,
  plays: z.array(trickPlaySchema).length(4),
  winnerPlayerId: ids.playerId,
  heartsCaptured: z.number().int().min(0).max(4),
  queenOfSpadesCaptured: z.boolean(),
});

const perPlayerCountSchema = z.partialRecord(
  ids.playerId,
  z.number().int().min(0),
);

const standingSchema = z.object({
  playerId: ids.playerId,
  rank: z.number().int().min(1).max(4),
  result: z.enum(["win", "draw", "loss"]),
  score: z.number().int().min(0).max(26),
});

export const heartsOutcomeSchema = z.object({
  reason: z.object({
    code: z.literal("HAND_COMPLETE"),
    message: z.string().optional(),
  }),
  standings: z.array(standingSchema).length(4),
}) satisfies z.ZodType<GameOutcome<string>>;

export const publicStateSchema = z.object({
  playerIds: z.array(ids.playerId).length(4),
  heartsBroken: z.boolean(),
  tricksCompleted: z.number().int().min(0).max(13),
  capturedHeartsByPlayer: perPlayerCountSchema,
  queenOfSpadesCapturedBy: ids.playerId.nullable(),
  tricksWonByPlayer: perPlayerCountSchema,
  trickHistory: z.array(completedTrickSchema).max(13),
  pointsByPlayer: perPlayerCountSchema,
  moonShooter: ids.playerId.nullable(),
  completed: z.boolean(),
  outcome: heartsOutcomeSchema.nullable(),
});

export const privateStateSchema = z.object({});
export const hiddenStateSchema = z.object({});

export const setupPhaseStateSchema = z.object({});
export const passingPhaseStateSchema = z.object({});
export const playingPhaseStateSchema = z.object({
  leadSuit: suitSchema.nullable(),
  plays: z.array(trickPlaySchema).max(3),
});
export const scoreHandPhaseStateSchema = z.object({});
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
    passing: passingPhaseStateSchema,
    playing: playingPhaseStateSchema,
    scoreHand: scoreHandPhaseStateSchema,
    gameOver: gameOverPhaseStateSchema,
  },
  errors: {
    HEARTS_NOT_BROKEN: "Hearts have not been broken.",
    INVALID_CARD_PLAY: "That card is not legal in the current trick.",
    MUST_FOLLOW_SUIT: "You must follow the lead suit.",
    MUST_LEAD_TWO_OF_CLUBS: "The 2 of Clubs must lead the first trick.",
    NOT_YOUR_TURN: "Only the active player may play a card.",
    NO_PENALTIES_FIRST_TRICK:
      "A non-penalty card must be discarded on the first trick when possible.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type GameErrorCode = ErrorCodeOfContract<GameContract>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type TrickPlay = z.infer<typeof trickPlaySchema>;
export type CompletedTrick = z.infer<typeof completedTrickSchema>;
export type PlayingPhaseState = z.infer<typeof playingPhaseStateSchema>;
export type HeartsOutcome = z.infer<typeof heartsOutcomeSchema>;
export type Suit = z.infer<typeof suitSchema>;
