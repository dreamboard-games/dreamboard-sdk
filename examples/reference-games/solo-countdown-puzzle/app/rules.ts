import type {
  BeaconId,
  GameErrorCode,
  GameState,
  OutcomeCode,
  PlayerId,
  PublicState,
} from "./game-contract";
import { beaconIds, weatherDeck } from "./game-contract";
import type { GameOutcome } from "@dreamboard-games/sdk/reducer";

export const HUMAN_PLAYER_ID = "player-1";
export const MAX_BEACON_LEVEL = 2;
export const STORM_LIMIT = 6;

export function initialPublicState(): PublicState {
  return {
    turnsRemaining: 8,
    energy: 5,
    storm: 0,
    reinforcement: 0,
    beacons: Object.fromEntries(
      beaconIds.map((beaconId) => [beaconId, 0]),
    ) as Record<BeaconId, number>,
    weatherDeck: weatherDeck.map((card) => card.id),
    events: [],
    completed: false,
    outcome: null,
  };
}

export function validateRepair(
  state: Pick<GameState, "publicState">,
  options: { playerId: string; beaconId: string },
): { ok: true } | { ok: false; errorCode: GameErrorCode; message: string } {
  if (state.publicState.completed) {
    return {
      ok: false,
      errorCode: "GAME_ALREADY_COMPLETE",
      message: "The lighthouse result is already final.",
    };
  }
  if (options.playerId !== HUMAN_PLAYER_ID) {
    return {
      ok: false,
      errorCode: "PLAYER_NOT_AUTHORIZED",
      message: "Only the human player may repair a beacon.",
    };
  }
  if (!beaconIds.includes(options.beaconId as BeaconId)) {
    return {
      ok: false,
      errorCode: "UNKNOWN_BEACON",
      message: "Choose a known beacon space.",
    };
  }
  if (state.publicState.energy <= 0) {
    return {
      ok: false,
      errorCode: "NOT_ENOUGH_ENERGY",
      message: "Repairing a beacon costs one energy.",
    };
  }
  return { ok: true };
}

export function allBeaconsLit(beacons: Record<BeaconId, number>): boolean {
  return beaconIds.every((beaconId) => beacons[beaconId] >= MAX_BEACON_LEVEL);
}

export function beaconScore(beacons: Record<BeaconId, number>): number {
  return beaconIds.reduce((total, beaconId) => total + beacons[beaconId], 0);
}

export function nextWeather(deck: readonly string[]): {
  card: (typeof weatherDeck)[number];
  remainingDeck: WeatherCardId[];
} {
  const [cardId, ...remaining] = deck;
  const card =
    weatherDeck.find((candidate) => candidate.id === cardId) ?? weatherDeck[0];
  return {
    card,
    remainingDeck:
      remaining.length > 0
        ? (remaining as WeatherCardId[])
        : weatherDeck.map((entry) => entry.id),
  };
}

export type WeatherCardId = (typeof weatherDeck)[number]["id"];

export function makeOutcome(
  code: OutcomeCode,
  score: number,
): GameOutcome<PlayerId> {
  const result = code === "all-beacons-lit" ? "win" : "loss";
  const label =
    code === "all-beacons-lit"
      ? "All beacons lit"
      : code === "storm-six"
        ? "Storm reached six"
        : "Countdown exhausted";
  return {
    reason: { code, message: label },
    standings: [
      {
        playerId: HUMAN_PLAYER_ID as PlayerId,
        rank: 1,
        result,
        score,
        scoreBreakdown: [
          {
            id: "beacon-levels",
            label: "Beacon levels",
            value: score,
          },
        ],
      },
    ],
  };
}
