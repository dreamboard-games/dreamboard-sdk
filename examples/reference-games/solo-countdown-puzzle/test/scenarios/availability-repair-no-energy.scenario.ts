import { repair } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.availability-repair-no-energy",
  description: "Repair becomes unavailable when the keeper has no energy.",
  setup: { players: 1, seed: 13 },
  given: [
    repair("beacon-north"),
    repair("beacon-north"),
    repair("beacon-harbor"),
    repair("beacon-south"),
  ],
  when: [repair("beacon-south")],
  then: async ({ expect, probe, state }) => {
    expect(state().publicState.energy).toBe(0);
    await expect(await probe(repair("beacon-north"))).toRejectWith({
      errorCode: "NOT_ENOUGH_ENERGY",
    });
  },
});
