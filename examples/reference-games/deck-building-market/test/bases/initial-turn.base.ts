import { defineBase } from "../testing-types.ts";

// Two-player opening state: starter decks dealt, hands drawn, player-1 to act.
export default defineBase({
  id: "initial-turn",
  seed: 1337,
  players: 2,
  setup: async () => undefined,
});
