export const repairBeaconScenario = {
  id: "solo-countdown-puzzle.repair-beacon",
  from: "standard",
  input: {
    interactionId: "repairBeacon",
    beaconId: "beacon-north",
  },
  asserts: [
    "repair spends one energy",
    "repair raises selected beacon",
    "resolveWeather appends deterministic event",
    "advanceCountdown appends deterministic event",
  ],
} as const;
