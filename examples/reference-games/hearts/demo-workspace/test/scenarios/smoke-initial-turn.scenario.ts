import { defineScenario } from "../testing-types";

export default defineScenario({
  id: "smoke-initial-turn",
  description:
    "Sanity check that Hearts boots through setup into the passing phase.",
  from: "initial-hand",
  when: async () => undefined,
  then: ({ expect, interactions, players, state }) => {
    const playerIds = players();
    expect(playerIds).toHaveLength(4);
    expect(state()).toBe("passing");
    for (const playerId of playerIds) {
      const submit = interactions(playerId).find(
        (descriptor) => descriptor.interactionId === "submit",
      );
      expect(submit).toBeDefined();
      expect(submit!.availability.status).toBe("available");
    }
  },
});
