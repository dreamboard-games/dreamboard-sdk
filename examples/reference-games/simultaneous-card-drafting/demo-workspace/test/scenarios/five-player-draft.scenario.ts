import { defineScenario } from "../testing-types";

export default defineScenario({
  id: "five-player-draft",
  description: "Five-player setup deals seven-card hands and starts drafting.",
  from: "five-player-initial-turn",
  phase: "drafting",
  when: async () => undefined,
  then: ({ expect, interactions, players, state, view, seat }) => {
    const playerIds = players();
    expect(playerIds).toHaveLength(5);
    expect(state()).toBe("drafting");
    expect(view(seat(0)).handCount).toBe(7);
    for (const playerId of playerIds) {
      expect(interactions(playerId)).toHaveInteraction("submit");
    }
  },
});
