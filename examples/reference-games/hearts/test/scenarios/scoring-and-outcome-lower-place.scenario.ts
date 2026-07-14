import { allHeartsLeadPath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.scoring-and-outcome-lower-place",
  description:
    "Equal second-place scores produce competition ranks 1, 2, 2, 4.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: allHeartsLeadPath.slice(0, 55),
  when: [allHeartsLeadPath[55]],
  then: ({ expect, state }) => {
    const standings = state().publicState.outcome?.standings ?? [];
    expect(standings.map(({ rank }) => rank)).toEqual([1, 2, 2, 4]);
    expect(standings[1]).toMatchObject({ rank: 2, result: "loss", score: 4 });
    expect(standings[2]).toMatchObject({ rank: 2, result: "loss", score: 4 });
  },
});
