import { z } from "zod";
import {
  defineGameContract,
  type GameOutcome,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";
import {
  ids,
  manifestContract,
  type PlayerId,
} from "../shared/manifest-contract";

export const cargoKindSchema = z.enum(["timber", "grain", "ore"]);
export const instructionKindSchema = z.enum([
  "claimHighest",
  "claimKind",
  "sweepLeft",
]);

export const procedureEventSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("rival-instruction-revealed"),
    round: z.number().int().min(1).max(6),
    instructionId: ids.cardId,
    instructionKind: instructionKindSchema,
    cargoKind: cargoKindSchema.optional(),
  }),
  z.object({
    kind: z.literal("rival-cargo-claimed"),
    round: z.number().int().min(1).max(6),
    cargoId: ids.cardId,
    cargoKind: cargoKindSchema,
    value: z.number().int().min(1).max(3),
    position: z.number().int().min(0).max(3),
    rivalProgress: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal("rival-river-swept"),
    round: z.number().int().min(1).max(6),
    cargoId: ids.cardId,
    cargoKind: cargoKindSchema,
    value: z.number().int().min(1).max(3),
    position: z.literal(0),
    progressGain: z.literal(1),
    rivalProgress: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal("river-refilled"),
    round: z.number().int().min(1).max(6),
    cargoId: ids.cardId,
    position: z.number().int().min(0).max(3),
    source: z.enum(["human", "rival"]),
    playerId: ids.playerId.optional(),
  }),
  z.object({
    kind: z.literal("river-round-advanced"),
    completedRound: z.number().int().min(1).max(6),
    nextRound: z.number().int().min(2).max(6).nullable(),
  }),
]);

export const publicStateSchema = z.object({
  round: z.number().int().min(1).max(6).default(1),
  activeHumanIndex: z.number().int().min(0).max(1).default(0),
  rivalProgress: z.number().int().nonnegative().default(0),
  procedureEvents: z.array(procedureEventSchema).default([]),
  outcome: z.custom<GameOutcome<PlayerId>>().nullable().default(null),
});

export const privateStateSchema = z.object({});
export const hiddenStateSchema = z.object({});

export const setupPhaseStateSchema = z.object({});
export const humanTurnPhaseStateSchema = z.object({});
export const resolveRivalPhaseStateSchema = z.object({});
export const advanceRiverRoundPhaseStateSchema = z.object({});
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
    humanTurn: humanTurnPhaseStateSchema,
    resolveRival: resolveRivalPhaseStateSchema,
    advanceRiverRound: advanceRiverRoundPhaseStateSchema,
    gameOver: gameOverPhaseStateSchema,
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type ProcedureEvent = z.infer<typeof procedureEventSchema>;
export type CargoKind = z.infer<typeof cargoKindSchema>;
export type InstructionKind = z.infer<typeof instructionKindSchema>;
