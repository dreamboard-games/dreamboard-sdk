import { z } from "zod";
import { ids, manifestContract } from "../shared/manifest-contract";
import {
  defineGameContract,
  type ErrorCodeOfContract,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";

export const rollSchema = z.object({
  round: z.number().int().min(1).max(8),
  dice: z.tuple([
    z.number().int().min(1).max(6),
    z.number().int().min(1).max(6),
  ]),
  total: z.number().int().min(2).max(12),
});

export const surveyedMarkSchema = z.object({
  kind: z.literal("surveyed"),
  round: z.number().int().min(1).max(8),
  rolledTotal: z.number().int().min(2).max(12),
});

export const failedMarkSchema = z.object({
  kind: z.literal("failed"),
  round: z.number().int().min(1).max(8),
});

export const scoreComponentsSchema = z.object({
  completeRows: z.number().int().min(0),
  completeColumns: z.number().int().min(0),
  largestRegion: z.number().int().min(0),
  failedSurveys: z.number().int().min(0),
});

export const scoreSchema = z.object({
  total: z.number().int(),
  components: scoreComponentsSchema,
});

export const markSchema = z.discriminatedUnion("kind", [
  surveyedMarkSchema,
  failedMarkSchema,
]);

const marksByPlayerSchema = z.partialRecord(
  ids.playerId,
  z.partialRecord(ids.spaceId, markSchema),
);

const scoresByPlayerSchema = z.partialRecord(ids.playerId, scoreSchema);

export const publicStateSchema = z.object({
  round: z.number().int().min(1).max(8),
  activePlayerIndex: z.number().int().min(0),
  playerIds: z.array(ids.playerId),
  roll: rollSchema.nullable(),
  marks: marksByPlayerSchema,
  completed: z.boolean(),
  scores: scoresByPlayerSchema.nullable(),
  outcome: z
    .object({
      reason: z.object({
        code: z.literal("SURVEY_COMPLETE"),
        message: z.string(),
      }),
      standings: z.array(
        z.object({
          playerId: ids.playerId,
          rank: z.number().int().min(1),
          result: z.enum(["win", "loss", "draw"]),
          score: z.number().int(),
        }),
      ),
    })
    .nullable(),
});

export const privateStateSchema = z.object({});
export const hiddenStateSchema = z.object({});
export const setupPhaseStateSchema = z.object({});
export const markSurveyPhaseStateSchema = z.object({});
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
    markSurvey: markSurveyPhaseStateSchema,
    gameOver: gameOverPhaseStateSchema,
  },
  errors: {
    CELL_ALREADY_MARKED: "Choose an unmarked scorecard cell.",
    CELL_DOES_NOT_MATCH_ROLL: "Choose an unmarked cell matching the roll.",
    PHASE_NOT_MARKING: "A survey mark can only be submitted while marking.",
    PLAYER_NOT_ACTIVE: "Players resolve the shared roll in seat order.",
    STALE_SUBMISSION: "The submitted draft belongs to an earlier roll.",
    UNKNOWN_CELL: "The selected scorecard cell does not exist.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type GameErrorCode = ErrorCodeOfContract<GameContract>;
export type Roll = z.infer<typeof rollSchema>;
export type SurveyMark = z.infer<typeof markSchema>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type Score = z.infer<typeof scoreSchema>;
