import { allPenaltyPasses, play } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.card-legality-first-trick-all-penalty",
  description:
    "A Club-void player whose entire hand is Hearts plus the Queen of Spades may discard a penalty on trick one.",
  setup: { players: 4, seed: 69492, setupProfileId: "default" },
  given: [...allPenaltyPasses, play(0, "clubs-2"), play(1, "clubs-J")],
  when: [play(2, "hearts-2")],
  then: ({ expect, state, view }) => {
    expect(state().publicState.heartsBroken).toBe(true);
    expect(
      view({ seat: 2 }).hand.every(
        ({ properties }) =>
          properties.suit === "hearts" ||
          (properties.suit === "spades" && properties.rank === "Q"),
      ),
    ).toBe(true);
    expect(view({ seat: 0 }).currentTrickPlays).toHaveLength(3);
  },
});
