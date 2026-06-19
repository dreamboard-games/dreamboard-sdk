import { defineScenario } from "../testing-types.ts";

// Vertex and adjacent edge for seat 0's first camp
const P1_VERTEX = "hex-vertex:-1,-1,2";
const P1_EDGE = "hex-edge:-1,-1,2::-2,-2,4";

export default defineScenario({
  id: "setup-place",
  description: "Seat 0 places a camp and trail during setup",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const player = seat(0);
    await game.submit(player, "placeSetupCamp", { vertexId: P1_VERTEX });
    await game.submit(player, "placeSetupTrail", { edgeId: P1_EDGE });
  },
  then: ({ expect, state, view, seat }) => {
    // After seat 0 finishes, the game is still in setup (seat 1's turn).
    expect(state()).toBe("setup");
    const p1View = view(seat(0));
    expect(p1View.coloniesByVertexId[P1_VERTEX]).toBeDefined();
    expect(p1View.trailsByEdgeId[P1_EDGE]).toBeDefined();
  },
});
