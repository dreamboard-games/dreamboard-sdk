import { z } from "zod";
import { ids, manifestContract } from "../shared/manifest-contract";
import {
  defineGameContract,
  type ErrorCodeOfContract,
  type GameOutcome,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";

const perPlayerScore = z
  .partialRecord(ids.playerId, z.number().int())
  .default({});

export const publicStateSchema = z.object({
  round: z.number().int().min(1).max(3).default(1),
  totalScoreByPlayer: perPlayerScore,
  roundScoreByPlayer: perPlayerScore,
  puddingScoreByPlayer: perPlayerScore,
  outcome: z.custom<GameOutcome<string>>().nullable().default(null),
});

export const privateStateSchema = z.object({});
export const hiddenStateSchema = z.object({});

export const setupPhaseStateSchema = z.object({});
export const draftingPhaseStateSchema = z.object({});
export const scoreRoundPhaseStateSchema = z.object({});
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
    scoreRound: scoreRoundPhaseStateSchema,
    gameOver: gameOverPhaseStateSchema,
  },
  errors: {
    CHOPSTICKS_NOT_AVAILABLE:
      "Chopsticks can only be used after you kept them on a previous turn.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type GameErrorCode = ErrorCodeOfContract<GameContract>;
export type PublicState = z.infer<typeof publicStateSchema>;
