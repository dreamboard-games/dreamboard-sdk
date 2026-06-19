import { z } from "zod";
import { ids, manifestContract } from "../shared/manifest-contract";
import {
  defineGameContract,
  type ErrorCodeOfContract,
  type GameOutcome,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";

export const beaconIds = [
  "beacon-north",
  "beacon-harbor",
  "beacon-south",
] as const;

export const weatherDeck = [
  { id: "calm-1", kind: "calm", stormDelta: 0 },
  { id: "gale-1", kind: "gale", stormDelta: 1 },
  { id: "squall-1", kind: "squall", stormDelta: 2 },
  { id: "calm-2", kind: "calm", stormDelta: 0 },
] as const;

export const beaconIdSchema = z.enum(beaconIds);
export type BeaconId = z.infer<typeof beaconIdSchema>;
export type WeatherCardId = (typeof weatherDeck)[number]["id"];
export type WeatherKind = (typeof weatherDeck)[number]["kind"];

export const beaconsSchema = z.record(beaconIdSchema, z.number().int().min(0));

export const systemEventSchema = z.object({
  kind: z.literal("systemAction"),
  procedureId: z.enum(["resolve-weather", "advance-countdown"]),
  title: z.string(),
  summary: z.string(),
});

export const outcomeCodeSchema = z.enum([
  "all-beacons-lit",
  "storm-six",
  "countdown-exhausted",
]);

export type OutcomeCode = z.infer<typeof outcomeCodeSchema>;

export const publicStateSchema = z.object({
  turnsRemaining: z.number().int().min(0),
  energy: z.number().int().min(0),
  storm: z.number().int().min(0),
  reinforcement: z.number().int().min(0),
  beacons: beaconsSchema,
  weatherDeck: z.array(z.enum(["calm-1", "gale-1", "squall-1", "calm-2"])),
  events: z.array(systemEventSchema),
  completed: z.boolean(),
  outcome: z.custom<GameOutcome<PlayerId> | null>(),
});

export const privateStateSchema = z.object({});
export const hiddenStateSchema = z.object({});
export const playerTurnPhaseStateSchema = z.object({});
export const resolveWeatherPhaseStateSchema = z.object({});
export const advanceCountdownPhaseStateSchema = z.object({});
export const gameOverPhaseStateSchema = z.object({});

export const gameContract = defineGameContract({
  manifest: manifestContract,
  state: {
    public: publicStateSchema,
    private: privateStateSchema,
    hidden: hiddenStateSchema,
  },
  phases: {
    playerTurn: playerTurnPhaseStateSchema,
    resolveWeather: resolveWeatherPhaseStateSchema,
    advanceCountdown: advanceCountdownPhaseStateSchema,
    gameOver: gameOverPhaseStateSchema,
  },
  errors: {
    PLAYER_NOT_AUTHORIZED: "Only the human player may repair a beacon.",
    UNKNOWN_BEACON: "Choose a known beacon space.",
    NOT_ENOUGH_ENERGY: "Repairing a beacon costs one energy.",
    GAME_ALREADY_COMPLETE: "The lighthouse result is already final.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type GameErrorCode = ErrorCodeOfContract<GameContract>;
export type PlayerId = z.infer<typeof ids.playerId>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type SystemEvent = z.infer<typeof systemEventSchema>;
