import { z } from "zod";
import { ids, manifestContract } from "../shared/manifest-contract";
import {
  defineGameContract,
  type ErrorCodeOfContract,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";

const perPlayerCount = z.partialRecord(ids.playerId, z.number().int().min(0));

export const trickPlaySchema = z.object({
  playerId: ids.playerId,
  cardId: ids.cardId,
});

export const publicStateSchema = z.object({
  // One-indexed hand counter. The production demo loops into a second hand
  // after scoring so visitors can verify restart-free round progression.
  roundNumber: z.number().int().min(1).default(1),

  // Hand-scoped scoring counters. Refreshed at hand start; read by
  // `scoreHand` to compute final hand points incl. shoot-the-moon.
  heartsTakenByPlayer: perPlayerCount.default({}),
  queenTakenBy: ids.playerId.nullable().default(null),
  tricksWonByPlayer: perPlayerCount.default({}),

  // Cross-trick legality flag. Once any heart hits the trick pile, hearts
  // can be led on subsequent tricks.
  heartsBroken: z.boolean().default(false),

  // First-trick guard ("no penalty cards on the opening trick").
  isFirstTrick: z.boolean().default(true),

  // Per-hand running points. Computed at hand end inside `scoreHand`.
  pointsThisHand: perPlayerCount.default({}),

  // Cumulative Hearts score across hands. The game ends when any player
  // reaches the conventional 100-point threshold.
  totalPointsByPlayer: perPlayerCount.default({}),

  // Last hand's moon-shooter, surfaced in the game-over view once cumulative
  // scoring reaches the end threshold.
  moonShooter: ids.playerId.nullable().default(null),
});

export const privateStateSchema = z.object({});
export const hiddenStateSchema = z.object({});

export const setupPhaseStateSchema = z.object({});
export const passingPhaseStateSchema = z.object({});
export const playingPhaseStateSchema = z.object({
  leadSuit: z.enum(["clubs", "diamonds", "spades", "hearts"]).nullable(),
  plays: z.array(trickPlaySchema),
  tricksPlayed: z.number().int().min(0).max(13),
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
    INVALID_CARD_PLAY: "Card is not legal right now.",
    MUST_FOLLOW_SUIT: "You must follow the lead suit.",
    MUST_LEAD_TWO_OF_CLUBS: "The 2 of Clubs must lead the first trick.",
    NOT_YOUR_TURN: "Not your turn.",
    NO_PENALTIES_FIRST_TRICK:
      "Penalty cards may not be played on the first trick.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type GameErrorCode = ErrorCodeOfContract<GameContract>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type TrickPlay = z.infer<typeof trickPlaySchema>;
export type PlayingPhaseState = z.infer<typeof playingPhaseStateSchema>;
export type Suit = "clubs" | "diamonds" | "spades" | "hearts";
