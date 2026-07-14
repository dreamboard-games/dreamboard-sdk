import { reinforce } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.availability-reinforce-stored",
  description:
    "Calm preserves a stored reinforcement, which prevents storing another one.",
  setup: { players: 1, seed: 1 },
  given: [],
  when: [reinforce],
  then: async ({ expect, probe, state }) => {
    expect(state().publicState.reinforcement).toBe(true);
    await expect(await probe(reinforce)).toRejectWith({
      errorCode: "REINFORCEMENT_ALREADY_STORED",
    });
  },
});
