import { defineBase } from "../testing-types";

export default defineBase({
  id: "initial-turn",
  seed: 1337,
  players: 2,
  setup: async () => undefined,
});
