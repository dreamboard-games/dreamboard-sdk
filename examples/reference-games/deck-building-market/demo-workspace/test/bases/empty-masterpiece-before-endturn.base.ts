import { defineBase } from "../testing-types";

export default defineBase({
  id: "empty-masterpiece-before-endturn",
  seed: 42,
  players: 2,
  setupProfileId: "empty-masterpiece-regression",
  setup: async () => {},
});
