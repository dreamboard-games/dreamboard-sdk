import { firstTrickPenaltyPasses, play } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.card-legality-first-trick-penalty",
  description:
    "A Club-void player with safe discards cannot discard a Heart or the Queen of Spades on trick one.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: [
    ...firstTrickPenaltyPasses,
    play(1, "clubs-2"),
    play(2, "clubs-4"),
    play(3, "clubs-7"),
  ],
  when: [],
  then: ({ expect, state }) => {
    expect(state().flow.activePlayers).toEqual(["player-1"]);
    expect(state().publicState.tricksCompleted).toBe(0);
  },
});
