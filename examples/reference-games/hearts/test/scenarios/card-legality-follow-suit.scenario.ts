import { firstTrickPenaltyPasses, play } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.card-legality-follow-suit",
  description: "A player holding Clubs follows the opening Club lead.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: [...firstTrickPenaltyPasses, play(1, "clubs-2")],
  when: [play(2, "clubs-4")],
  then: ({ expect, state, view }) => {
    expect(state().flow.activePlayers).toEqual(["player-4"]);
    expect(
      view({ seat: 0 }).currentTrickPlays.map(({ cardId }) => cardId),
    ).toEqual(["clubs-2", "clubs-4"]);
  },
});
