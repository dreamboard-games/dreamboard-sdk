import { defineBase } from "../testing-types";
import { SETUP } from "./after-setup.base";

export default defineBase({
  id: "terminal-before-endturn",
  seed: 1337,
  players: 4,
  setupProfileId: "terminal-regression",
  setup: async ({ game, seat }) => {
    for (const step of SETUP) {
      const player = seat(step.seat);
      await game.submit(player, "placeSetupCamp", {
        vertexId: step.vertex,
      });
      await game.submit(player, "placeSetupTrail", { edgeId: step.edge });
    }
  },
});
