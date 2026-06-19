import { z } from "zod";
import { ids, manifestContract } from "../shared/manifest-contract";
import {
  defineGameContract,
  type ErrorCodeOfContract,
  type GameEvent,
  type GameOutcome,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";

export const cargoKindSchema = z.enum(["timber", "ore", "grain"]);
export const cargoSchema = z.object({
  id: z.string(),
  kind: cargoKindSchema,
  value: z.number().int().min(1),
});
export const rivalInstructionSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string(), kind: z.literal("claimHighest") }),
  z.object({
    id: z.string(),
    kind: z.literal("claimKind"),
    cargoKind: cargoKindSchema,
  }),
  z.object({ id: z.string(), kind: z.literal("sweepLeft") }),
]);
export const processedClaimSchema = z.object({
  eventStart: z.number().int().min(0),
  eventCount: z.number().int().min(0),
});
export const publicStateSchema = z.object({
  round: z.number().int().min(1).default(1),
  river: z.array(cargoSchema).default([]),
  supply: z.array(cargoSchema).default([]),
  rivalDeck: z.array(rivalInstructionSchema).default([]),
  rivalProgress: z.number().int().min(0).default(0),
  teamScore: z.number().int().min(0).default(0),
  eventLog: z.array(z.custom<GameEvent>()).default([]),
  processedClaims: z.record(z.string(), processedClaimSchema).default({}),
  outcome: z.custom<GameOutcome<string>>().nullable().default(null),
});
export const privateStateSchema = z.object({});
export const hiddenStateSchema = z.object({});

export const setupPhaseStateSchema = z.object({});
export const humanTurnPhaseStateSchema = z.object({});
export const gameOverPhaseStateSchema = z.object({});

export const claimCargoParamsSchema = z.object({
  claimId: z.string().min(1).default("main-claim"),
});

export const gameContract = defineGameContract({
  manifest: manifestContract,
  state: {
    public: publicStateSchema,
    private: privateStateSchema,
    hidden: hiddenStateSchema,
  },
  phases: {
    setup: setupPhaseStateSchema,
    humanTurn: humanTurnPhaseStateSchema,
    gameOver: gameOverPhaseStateSchema,
  },
  errors: {
    PLAYER_NOT_AUTHORIZED: "Only the human player may claim cargo.",
    GAME_ALREADY_COMPLETE: "This river race is already complete.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type GameErrorCode = ErrorCodeOfContract<GameContract>;
export type Cargo = z.infer<typeof cargoSchema>;
export type CargoKind = z.infer<typeof cargoKindSchema>;
export type RivalInstruction = z.infer<typeof rivalInstructionSchema>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type ClaimCargoParams = z.infer<typeof claimCargoParamsSchema>;
export type PlayerId = z.infer<typeof ids.playerId>;
