import { lowerTiePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.ranking-and-ties-lower-place",
  description:
    "A lower-place true tie uses competition ranks 1, 2, 2, 4 and both tied organizers lose.",
  setup: { players: 4, seed: 4 },
  given: lowerTiePath.slice(0, 23),
  when: [lowerTiePath[23]],
  then: ({ expect, state }) => {
    const standings = state().publicState.outcome?.standings ?? [];
    expect(standings.map(({ rank }) => rank)).toEqual([1, 2, 2, 4]);
    expect(standings[1]).toMatchObject({ score: 19, result: "loss" });
    expect(standings[2]).toMatchObject({ score: 19, result: "loss" });
    expect(standings[1]?.tieBreaks).toEqual(standings[2]?.tieBreaks);
  },
});
