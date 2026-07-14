import {
  defineGameContract,
  type ErrorCodeOfContract,
  type GameOutcome,
  type GameStateOf,
} from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
import { ids, manifestContract } from "../shared/manifest-contract";

export const beaconIds = [
  "beacon-north",
  "beacon-harbor",
  "beacon-south",
] as const;

export const weatherCardIds = [
  "calm-1",
  "calm-2",
  "gale-1",
  "gale-2",
  "gale-3",
  "north-squall",
  "harbor-squall",
  "south-squall",
] as const;

export const weatherKinds = [
  "calm",
  "gale",
  "north-squall",
  "harbor-squall",
  "south-squall",
] as const;

export const systemEventIds = [
  "weather-calm",
  "reinforcement-held",
  "storm-advanced",
  "beacon-dimmed",
  "countdown-advanced",
] as const;

export const outcomeCodes = [
  "ALL_BEACONS_LIT",
  "STORM_REACHED_LIGHTHOUSE",
  "DAWN_ARRIVED",
] as const;

export const beaconIdSchema = z.enum(beaconIds);
export const weatherCardIdSchema = z.enum(weatherCardIds);
export const weatherKindSchema = z.enum(weatherKinds);
export const systemEventIdSchema = z.enum(systemEventIds);
export const outcomeCodeSchema = z.enum(outcomeCodes);

export type BeaconId = z.infer<typeof beaconIdSchema>;
export type WeatherCardId = z.infer<typeof weatherCardIdSchema>;
export type WeatherKind = z.infer<typeof weatherKindSchema>;
export type SystemEventId = z.infer<typeof systemEventIdSchema>;
export type OutcomeCode = z.infer<typeof outcomeCodeSchema>;
export type PlayerId = z.infer<typeof ids.playerId>;

export const beaconsSchema = z.record(
  beaconIdSchema,
  z.number().int().min(0).max(2),
);

export const revealedWeatherSchema = z.object({
  cardId: weatherCardIdSchema,
  kind: weatherKindSchema,
  beaconId: beaconIdSchema.nullable(),
});

export const systemEventSchema = z.object({
  kind: z.literal("systemAction"),
  id: systemEventIdSchema,
  procedureId: z.enum(["resolve-weather", "advance-countdown"]),
  weatherCardId: weatherCardIdSchema.nullable(),
  beaconId: beaconIdSchema.nullable(),
  previousValue: z.number().int().nullable(),
  nextValue: z.number().int().nullable(),
  title: z.string(),
  summary: z.string(),
});

export const publicStateSchema = z.object({
  turnsRemaining: z.number().int().min(0).max(8),
  energy: z.number().int().min(0).max(7),
  storm: z.number().int().min(0).max(6),
  reinforcement: z.boolean(),
  beacons: beaconsSchema,
  weatherHistory: z.array(revealedWeatherSchema),
  events: z.array(systemEventSchema),
  completed: z.boolean(),
  outcome: z.custom<GameOutcome<PlayerId> | null>(),
});

export const privateStateSchema = z.object({});
export const hiddenStateSchema = z.object({
  weatherDeck: z.array(weatherCardIdSchema),
});
export const setupPhaseStateSchema = z.object({});
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
    setup: setupPhaseStateSchema,
    playerTurn: playerTurnPhaseStateSchema,
    resolveWeather: resolveWeatherPhaseStateSchema,
    advanceCountdown: advanceCountdownPhaseStateSchema,
    gameOver: gameOverPhaseStateSchema,
  },
  errors: {
    BEACON_ALREADY_LIT: "Choose a beacon below level two.",
    ENERGY_AT_CAP: "Energy is already at its maximum of seven.",
    GAME_ALREADY_COMPLETE: "The lighthouse result is already final.",
    NOT_ENOUGH_ENERGY: "The selected action requires more energy.",
    REINFORCEMENT_ALREADY_STORED:
      "The sea wall already has a stored reinforcement.",
    UNKNOWN_BEACON: "Choose north, harbor, or south beacon.",
  },
});

export type GameContract = typeof gameContract;
export type GameState = GameStateOf<GameContract>;
export type GameErrorCode = ErrorCodeOfContract<GameContract>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type HiddenState = z.infer<typeof hiddenStateSchema>;
export type RevealedWeather = z.infer<typeof revealedWeatherSchema>;
export type SystemEvent = z.infer<typeof systemEventSchema>;
