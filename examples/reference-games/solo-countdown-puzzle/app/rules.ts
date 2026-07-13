import type { GameOutcome } from "@dreamboard-games/sdk/reducer";
import {
  beaconIds,
  type BeaconId,
  type HiddenState,
  type OutcomeCode,
  type PlayerId,
  type PublicState,
  type RevealedWeather,
  type SystemEvent,
  type WeatherCardId,
  type WeatherKind,
  weatherCardIds,
} from "./game-contract";

export const MAX_BEACON_LEVEL = 2;
export const MAX_ENERGY = 7;
export const STORM_LIMIT = 6;
export const STARTING_TURNS = 8;

export type WeatherCard = {
  readonly id: WeatherCardId;
  readonly kind: WeatherKind;
  readonly beaconId: BeaconId | null;
};

export const weatherCards = [
  { id: "calm-1", kind: "calm", beaconId: null },
  { id: "calm-2", kind: "calm", beaconId: null },
  { id: "gale-1", kind: "gale", beaconId: null },
  { id: "gale-2", kind: "gale", beaconId: null },
  { id: "gale-3", kind: "gale", beaconId: null },
  {
    id: "north-squall",
    kind: "north-squall",
    beaconId: "beacon-north",
  },
  {
    id: "harbor-squall",
    kind: "harbor-squall",
    beaconId: "beacon-harbor",
  },
  {
    id: "south-squall",
    kind: "south-squall",
    beaconId: "beacon-south",
  },
] as const satisfies readonly WeatherCard[];

export const weatherCardById = Object.fromEntries(
  weatherCards.map((card) => [card.id, card]),
) as Record<WeatherCardId, WeatherCard>;

export function createInitialPublicState(): PublicState {
  return {
    turnsRemaining: STARTING_TURNS,
    energy: 5,
    storm: 0,
    reinforcement: false,
    beacons: Object.fromEntries(
      beaconIds.map((beaconId) => [beaconId, 0]),
    ) as Record<BeaconId, number>,
    weatherHistory: [],
    events: [],
    completed: false,
    outcome: null,
  };
}

export function createInitialHiddenState(): HiddenState {
  return { weatherDeck: [] };
}

export function assertWeatherComposition(deck: readonly WeatherCardId[]): void {
  if (
    deck.length !== weatherCardIds.length ||
    [...deck].sort().join("|") !== [...weatherCardIds].sort().join("|")
  ) {
    throw new Error(
      "Last Light setup requires the exact eight-card weather deck.",
    );
  }
}

export function allBeaconsLit(beacons: Record<BeaconId, number>): boolean {
  return beaconIds.every((beaconId) => beacons[beaconId] >= MAX_BEACON_LEVEL);
}

export function repairableBeaconIds(state: PublicState): BeaconId[] {
  if (state.completed || state.energy < 1) return [];
  return beaconIds.filter(
    (beaconId) => state.beacons[beaconId] < MAX_BEACON_LEVEL,
  );
}

export function makeOutcome(
  code: OutcomeCode,
  playerId: PlayerId,
): GameOutcome<PlayerId> {
  const result = code === "ALL_BEACONS_LIT" ? "win" : "loss";
  const message =
    code === "ALL_BEACONS_LIT"
      ? "All three coastal beacons are fully lit."
      : code === "STORM_REACHED_LIGHTHOUSE"
        ? "The storm reached the lighthouse."
        : "Dawn arrived before every beacon was lit.";
  return {
    reason: { code, message },
    standings: [{ playerId, rank: 1, result }],
  };
}

function event(values: Omit<SystemEvent, "kind">): SystemEvent {
  return { kind: "systemAction", ...values };
}

function reveal(card: WeatherCard): RevealedWeather {
  return {
    cardId: card.id,
    kind: card.kind,
    beaconId: card.beaconId,
  };
}

export type WeatherResolution = {
  readonly publicState: PublicState;
  readonly hiddenState: HiddenState;
  readonly events: readonly SystemEvent[];
  readonly card: WeatherCard;
};

export function resolveNextWeather(
  publicState: PublicState,
  hiddenState: HiddenState,
): WeatherResolution {
  const [cardId, ...remainingDeck] = hiddenState.weatherDeck;
  if (!cardId) {
    throw new Error("Last Light weather deck was exhausted before game over.");
  }
  const card = weatherCardById[cardId];
  if (!card) {
    throw new Error(`Unknown Last Light weather card '${String(cardId)}'.`);
  }

  const dangerous = card.kind !== "calm";
  const history = [...publicState.weatherHistory, reveal(card)];
  if (dangerous && publicState.reinforcement) {
    const held = event({
      id: "reinforcement-held",
      procedureId: "resolve-weather",
      weatherCardId: card.id,
      beaconId: card.beaconId,
      previousValue: 1,
      nextValue: 0,
      title: "Reinforcement held",
      summary: `${card.id} was completely prevented by the reinforced sea wall.`,
    });
    return {
      card,
      hiddenState: { weatherDeck: remainingDeck },
      events: [held],
      publicState: {
        ...publicState,
        reinforcement: false,
        weatherHistory: history,
        events: [...publicState.events, held],
      },
    };
  }

  if (card.kind === "calm") {
    const calm = event({
      id: "weather-calm",
      procedureId: "resolve-weather",
      weatherCardId: card.id,
      beaconId: null,
      previousValue: null,
      nextValue: null,
      title: "Calm weather",
      summary: `${card.id} passed without changing the coast.`,
    });
    return {
      card,
      hiddenState: { weatherDeck: remainingDeck },
      events: [calm],
      publicState: {
        ...publicState,
        weatherHistory: history,
        events: [...publicState.events, calm],
      },
    };
  }

  const nextStorm = Math.min(STORM_LIMIT, publicState.storm + 1);
  const stormAdvanced = event({
    id: "storm-advanced",
    procedureId: "resolve-weather",
    weatherCardId: card.id,
    beaconId: card.beaconId,
    previousValue: publicState.storm,
    nextValue: nextStorm,
    title: "Storm advanced",
    summary: `${card.id} advanced the storm from ${publicState.storm} to ${nextStorm}.`,
  });
  const procedureEvents: SystemEvent[] = [stormAdvanced];
  const nextBeacons = { ...publicState.beacons };
  if (card.beaconId && nextBeacons[card.beaconId] > 0) {
    const previousLevel = nextBeacons[card.beaconId];
    const nextLevel = previousLevel - 1;
    nextBeacons[card.beaconId] = nextLevel;
    procedureEvents.push(
      event({
        id: "beacon-dimmed",
        procedureId: "resolve-weather",
        weatherCardId: card.id,
        beaconId: card.beaconId,
        previousValue: previousLevel,
        nextValue: nextLevel,
        title: "Beacon dimmed",
        summary: `${card.id} dimmed ${card.beaconId} from ${previousLevel} to ${nextLevel}.`,
      }),
    );
  }

  return {
    card,
    hiddenState: { weatherDeck: remainingDeck },
    events: procedureEvents,
    publicState: {
      ...publicState,
      storm: nextStorm,
      beacons: nextBeacons,
      weatherHistory: history,
      events: [...publicState.events, ...procedureEvents],
    },
  };
}

export function advanceCountdown(publicState: PublicState): {
  readonly publicState: PublicState;
  readonly event: SystemEvent;
} {
  const turnsRemaining = Math.max(0, publicState.turnsRemaining - 1);
  const countdownEvent = event({
    id: "countdown-advanced",
    procedureId: "advance-countdown",
    weatherCardId: null,
    beaconId: null,
    previousValue: publicState.turnsRemaining,
    nextValue: turnsRemaining,
    title: "Countdown advanced",
    summary: `${turnsRemaining} turn${turnsRemaining === 1 ? "" : "s"} remain before dawn.`,
  });
  return {
    event: countdownEvent,
    publicState: {
      ...publicState,
      turnsRemaining,
      events: [...publicState.events, countdownEvent],
    },
  };
}
