import { defineBase } from "../testing-types.ts";
import { SETUP } from "./after-setup.base.ts";
import { boardHelpers } from "../../shared/manifest-contract.ts";

const RELAY_VERTEX = "hex-vertex:2,5,-7";
const RELAY_EDGE = boardHelpers.resolveHexEdgeId("frontier", {
  spaces: ["h-2-11", "o-16"],
});

export default defineBase({
  id: "port-verification",
  seed: 1337,
  players: 4,
  setup: async ({ game, seat }) => {
    const setup = [
      { seat: 0, vertex: RELAY_VERTEX, edge: RELAY_EDGE },
      ...SETUP.slice(1),
    ] as const;

    for (const step of setup) {
      const player = seat(step.seat);
      await game.submit(player, "placeSetupCamp", {
        vertexId: step.vertex,
      });
      await game.submit(player, "placeSetupTrail", { edgeId: step.edge });
    }
  },
});
