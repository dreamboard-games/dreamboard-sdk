import { defineScenario } from "../testing-types";

export default defineScenario({
  id: "smoke-initial-turn",
  description:
    "After setup, the game deals hands and enters simultaneous drafting.",
  from: "initial-turn",
  phase: "drafting",
  when: async () => undefined,
  then: ({ expect, interactions, players, state, view, seat }) => {
    const playerIds = players();
    expect(playerIds).toHaveLength(4);
    expect(state()).toBe("drafting");
    expect(view(seat(0)).handCount).toBe(8);
    for (const playerId of playerIds) {
      expect(interactions(playerId)).toHaveInteraction("submit");
    }
  },
});
