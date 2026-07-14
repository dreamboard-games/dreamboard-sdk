import { reinforce, repair } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.availability-reinforce-no-energy",
  description: "Reinforce becomes unavailable below its two-energy cost.",
  setup: { players: 1, seed: 3 },
  given: [reinforce, repair("beacon-north")],
  when: [repair("beacon-north")],
  then: async ({ expect, probe, state }) => {
    expect(state().publicState.energy).toBe(1);
    expect(state().publicState.reinforcement).toBe(false);
    await expect(await probe(reinforce)).toRejectWith({
      errorCode: "NOT_ENOUGH_ENERGY",
    });
  },
});
