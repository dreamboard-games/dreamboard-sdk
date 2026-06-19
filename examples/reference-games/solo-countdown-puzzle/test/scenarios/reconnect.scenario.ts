export const reconnectScenario = {
  id: "solo-countdown-puzzle.reconnect",
  from: "after-repair",
  asserts: [
    "committed system events live in public state",
    "no bot or system actor is introduced",
  ],
} as const;
