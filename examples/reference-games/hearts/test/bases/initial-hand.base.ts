import { defineBase } from "../testing-types.ts";

export default defineBase({
  id: "initial-hand",
  seed: 42,
  players: 4,
  setup: async () => undefined,
});
