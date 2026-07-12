import { trueTiePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.ranking-and-ties-true-first",
  description:
    "Identical score, set, and coin tuples produce a true rank-one draw.",
  setup: { players: 2, seed: 25 },
  given: trueTiePath.slice(0, 11),
  when: [trueTiePath[11]],
  then: ({ expect, state }) => {
    const standings = state().publicState.outcome?.standings ?? [];
    expect(standings.map(({ rank }) => rank)).toEqual([1, 1]);
    expect(standings.map(({ result }) => result)).toEqual(["draw", "draw"]);
    expect(standings[0]?.score).toBe(18);
    expect(standings[1]?.score).toBe(18);
    expect(standings[0]?.tieBreaks).toEqual(standings[1]?.tieBreaks);
  },
});
