import { z } from "zod";
import { ids } from "../shared/manifest-contract";
import { manifestContract } from "../shared/manifest-contract";
import {
  defineGameContract,
  type GameOutcome,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";

const perPlayerScoreSchema = z
  .partialRecord(ids.playerId, z.number().int().nonnegative())
  .default({});
const perPlayerCardIdsSchema = z
  .partialRecord(ids.playerId, z.array(ids.cardId))
  .default({});

export const roundHistoryEntrySchema = z.object({
  round: z.number().int().min(1).max(2),
  scoreByPlayer: perPlayerScoreSchema,
  cardIdsByPlayer: perPlayerCardIdsSchema,
});

export const publicStateSchema = z.object({
  round: z.number().int().min(1).max(2).default(1),
  pick: z.number().int().min(1).max(6).default(1),
  totalScoreByPlayer: perPlayerScoreSchema,
  roundScoreByPlayer: perPlayerScoreSchema,
  roundHistory: z.array(roundHistoryEntrySchema).default([]),
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
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type RoundHistoryEntry = z.infer<typeof roundHistoryEntrySchema>;
