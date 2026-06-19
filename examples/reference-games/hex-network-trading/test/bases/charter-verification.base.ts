import { defineBase } from "../testing-types.ts";
import { SETUP } from "./after-setup.base.ts";

export default defineBase({
  id: "charter-verification",
  seed: 1337,
  players: 4,
  setupProfileId: "charter-verification",
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
