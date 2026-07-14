import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "sketchbook.setup-and-visibility",
  description:
    "A normal seeded setup creates two independently shuffled private starter decks and the exact public supply.",
  setup: { players: 2, seed: 1 },
  given: [],
  when: [],
  then: ({ expect, state, view }) => {
    expect(state().flow.currentPhase).toBe("playerTurn");
    expect(state().flow.activePlayers).toEqual(["player-1"]);
    expect(view({ seat: 0 }).myHand).toHaveLength(5);
    expect(view({ seat: 1 }).myHand).toHaveLength(5);
    expect(view({ seat: 0 }).handCountByPlayerId).toEqual({
      "player-1": 5,
      "player-2": 5,
    });
  },
});
