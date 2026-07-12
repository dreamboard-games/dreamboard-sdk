import { charge, repair } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.availability-charge",
  description:
    "Charge remains available below seven energy, caps at seven, and is unavailable at the cap.",
  setup: { players: 1, seed: 1 },
  given: [repair("beacon-north"), charge],
  when: [charge],
  then: async ({ expect, probe, state }) => {
    expect(state().publicState.energy).toBe(7);
    await expect(await probe(charge)).toRejectWith({ errorCode: "ENERGY_AT_CAP" });
  },
});
