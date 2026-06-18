import { defineScenario } from "../testing-types";

const SAME_DEEP_SPACE_NON_ENDPOINT_VERTEX_ID = "hex-vertex:1,7,-8";

export default defineScenario({
  id: "relay-nearby-vertex-no-rate",
  description:
    "An camp near a relay borderland tile but off the relay edge does not get a port rate",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    await game.submit(seat(0), "placeSetupCamp", {
      vertexId: SAME_DEEP_SPACE_NON_ENDPOINT_VERTEX_ID,
    });
  },
  then: ({ expect, view, seat }) => {
    expect(view(seat(0)).myBankTradeRates).toEqual({
      clay: 4,
      grain: 4,
      timber: 4,
      iron: 4,
      cloth: 4,
    });
  },
});
