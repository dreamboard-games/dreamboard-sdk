import { defineBase } from "../testing-types.ts";

// 8 well-separated vertex+edge pairs verified non-adjacent via edge-list analysis.
// Snake order: seat 0 → seat 1 → seat 2 → seat 3 (round 0), reversed in round 1.
export const SETUP = [
  // Round 0 (forward)
  { seat: 0, vertex: "hex-vertex:-8,7,1", edge: "hex-edge:-7,5,2::-8,7,1" },
  { seat: 1, vertex: "hex-vertex:8,-1,-7", edge: "hex-edge:7,-2,-5::8,-1,-7" },
  { seat: 2, vertex: "hex-vertex:-7,-1,8", edge: "hex-edge:-5,-2,7::-7,-1,8" },
  { seat: 3, vertex: "hex-vertex:7,-8,1", edge: "hex-edge:5,-7,2::7,-8,1" },
  // Round 1 (reverse)
  { seat: 3, vertex: "hex-vertex:8,-4,-4", edge: "hex-edge:7,-2,-5::8,-4,-4" },
  { seat: 2, vertex: "hex-vertex:-8,4,4", edge: "hex-edge:-7,2,5::-8,4,4" },
  { seat: 1, vertex: "hex-vertex:4,-5,1", edge: "hex-edge:2,-4,2::4,-5,1" },
  { seat: 0, vertex: "hex-vertex:-4,2,2", edge: "hex-edge:-2,1,1::-4,2,2" },
] as const;

export default defineBase({
  id: "after-setup",
  seed: 1337,
  players: 4,
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
