import { defineBase } from "../testing-types.ts";

export default defineBase({
  id: "initial-turn",
  seed: 1337,
  players: 4,
  setup: async () => undefined,
});
