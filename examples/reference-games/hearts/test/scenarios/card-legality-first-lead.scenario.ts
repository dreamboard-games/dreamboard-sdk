import { firstTrickPenaltyPasses, play } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.card-legality-first-lead",
  description: "Only the 2 of Clubs can be the first card of the first trick.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: firstTrickPenaltyPasses,
  when: [play(1, "clubs-2")],
  then: ({ expect, state, view }) => {
    expect(state().flow.activePlayers).toEqual(["player-3"]);
    expect(view({ seat: 0 }).currentTrickPlays).toEqual([
      { playerId: "player-2", cardId: "clubs-2" },
    ]);
  },
});
