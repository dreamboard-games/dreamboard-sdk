import { completeGamePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.card-legality-stale",
  description:
    "A card played into the completed first trick is no longer an eligible hand target when its player leads next.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: completeGamePath.slice(0, 8),
  when: [],
  then: ({ expect, state }) => {
    expect(state().flow.activePlayers).toEqual(["player-3"]);
    expect(state().publicState.trickHistory[0]?.winnerPlayerId).toBe(
      "player-3",
    );
  },
});
