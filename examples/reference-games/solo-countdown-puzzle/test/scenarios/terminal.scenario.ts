export const terminalScenario = {
  id: "solo-countdown-puzzle.terminal",
  from: "near-terminal",
  asserts: [
    "all beacons lit wins",
    "storm six loses",
    "countdown exhausted loses",
  ],
} as const;
