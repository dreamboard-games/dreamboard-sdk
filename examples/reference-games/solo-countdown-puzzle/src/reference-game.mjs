import { DREAMBOARD_SDK_PACKAGE_SET } from "@dreamboard-games/sdk/package-set";
import coverage from "../scenarios/coverage.json" with { type: "json" };

export const beaconSpaces = [
  { id: "beacon-north", row: 0, col: 1, name: "North Beacon" },
  { id: "beacon-harbor", row: 1, col: 1, name: "Harbor Beacon" },
  { id: "beacon-south", row: 2, col: 1, name: "South Beacon" },
];

export const weatherDeck = [
  { id: "calm-1", kind: "calm", stormDelta: 0 },
  { id: "gale-1", kind: "gale", stormDelta: 1 },
  { id: "squall-1", kind: "squall", stormDelta: 2 },
  { id: "calm-2", kind: "calm", stormDelta: 0 },
];

export function createInitialState() {
  return {
    phase: "playerTurn",
    playerIds: ["player-1"],
    turnsRemaining: 8,
    energy: 5,
    storm: 0,
    beacons: Object.fromEntries(beaconSpaces.map((space) => [space.id, 0])),
    weatherDeck: weatherDeck.map((card) => card.id),
    events: [],
    completed: false,
    terminal: null,
  };
}

export function validateRepair(state, { playerId = "player-1", beaconId }) {
  if (playerId !== "player-1") {
    return {
      ok: false,
      errorCode: "PLAYER_NOT_AUTHORIZED",
      message: "Only the human player may repair a beacon.",
    };
  }
  if (!state.beacons || state.beacons[beaconId] === undefined) {
    return {
      ok: false,
      errorCode: "UNKNOWN_BEACON",
      message: "Choose a known beacon space.",
    };
  }
  if (state.energy <= 0) {
    return {
      ok: false,
      errorCode: "NOT_ENOUGH_ENERGY",
      message: "Repairing a beacon costs one energy.",
    };
  }
  return { ok: true };
}

export function resolveWeather(state) {
  const [cardId, ...remainingDeck] = state.weatherDeck;
  const card = weatherDeck.find((candidate) => candidate.id === cardId);
  return {
    ...state,
    weatherDeck: remainingDeck,
    storm: state.storm + (card?.stormDelta ?? 0),
    events: [
      ...state.events,
      {
        kind: "systemAction",
        procedureId: "resolve-weather",
        title: "Resolve weather",
        summary: `${card?.kind ?? "calm"} changed storm by ${
          card?.stormDelta ?? 0
        }.`,
      },
    ],
  };
}

export function advanceCountdown(state) {
  return {
    ...state,
    turnsRemaining: state.turnsRemaining - 1,
    events: [
      ...state.events,
      {
        kind: "systemAction",
        procedureId: "advance-countdown",
        title: "Advance countdown",
        summary: `${state.turnsRemaining - 1} turns remain.`,
      },
    ],
  };
}

export function repairBeacon(
  state,
  { playerId = "player-1", beaconId = "beacon-north" } = {},
) {
  const validation = validateRepair(state, { playerId, beaconId });
  if (!validation.ok) {
    return { accepted: false, state, validation };
  }
  const repaired = {
    ...state,
    energy: state.energy - 1,
    beacons: {
      ...state.beacons,
      [beaconId]: Math.min(2, state.beacons[beaconId] + 1),
    },
  };
  return {
    accepted: true,
    state: advanceCountdown(resolveWeather(repaired)),
    validation,
  };
}

const initial = createInitialState();
const repair = repairBeacon(initial, { beaconId: "beacon-north" });

export const scenarioMetadata = {
  initial: { state: initial },
  repair,
  seedRepeat: {
    first: repairBeacon(createInitialState(), { beaconId: "beacon-north" }),
    second: repairBeacon(createInitialState(), { beaconId: "beacon-north" }),
  },
};

export const referenceGame = {
  id: "solo-countdown-puzzle",
  displayName: "Solo Countdown Puzzle",
  rulesBrief: "Last Light",
  sdkPackageSetVersion: DREAMBOARD_SDK_PACKAGE_SET.sdkVersion,
  coverage,
  players: { min: 1, max: 1 },
  guidance: {
    phase: {
      id: "playerTurn",
      label: "Repair the beacons",
      summary:
        "Choose a beacon, spend energy, then resolve weather and countdown events.",
      objective: "Light all three beacons before storm or countdown defeat.",
    },
    setup: {
      profileId: "standard",
      name: "Last Light setup",
      summary:
        "One human player starts with energy, three beacons, and a seeded weather deck.",
      steps: [
        {
          id: "place-beacons",
          label: "Place beacons",
          description:
            "Put north, harbor, and south beacons on the square grid.",
        },
        {
          id: "seed-weather",
          label: "Seed weather",
          description:
            "Use the deterministic weather deck for repeatable events.",
        },
      ],
    },
  },
  board: {
    id: "beacon-grid",
    layout: "square",
    scope: "shared",
    spaces: beaconSpaces,
  },
  interactions: [
    {
      id: "repair-beacon",
      label: "Repair beacon",
      help: "Spend one energy to raise the selected beacon by one level.",
      collector: "boardTarget.space",
    },
  ],
  systemProcedures: ["resolve-weather", "advance-countdown"],
};

if (
  typeof process !== "undefined" &&
  process.argv[1]?.endsWith("reference-game.mjs")
) {
  console.log(
    JSON.stringify({
      id: referenceGame.id,
      sdkPackageSetVersion: referenceGame.sdkPackageSetVersion,
      interactions: referenceGame.interactions.length,
      procedures: referenceGame.systemProcedures.length,
    }),
  );
}
