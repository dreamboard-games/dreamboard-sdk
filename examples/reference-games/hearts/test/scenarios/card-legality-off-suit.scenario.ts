import { completeGamePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.card-legality-off-suit",
  description:
    "After trick one, a player void in the lead suit may discard any card.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: completeGamePath.slice(0, 21),
  when: [completeGamePath[21]],
  then: ({ expect, view }) => {
    expect(
      view({ seat: 0 }).currentTrickPlays.map(({ cardId }) => cardId),
    ).toEqual(["spades-7", "clubs-7"]);
  },
});
