import { allHeartsLeadPath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.card-legality-all-hearts",
  description:
    "An unbroken-Hearts leader whose remaining hand contains only Hearts may lead one and break Hearts.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: allHeartsLeadPath.slice(0, 40),
  when: [allHeartsLeadPath[40]],
  then: ({ expect, state, view }) => {
    expect(state().publicState.heartsBroken).toBe(true);
    expect(view({ seat: 0 }).currentTrickPlays).toEqual([
      { playerId: "player-1", cardId: "hearts-J" },
    ]);
  },
});
