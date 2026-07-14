import { coinTieBreakPath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.ranking-and-ties-coin",
  description:
    "Equal scores and complete-set counts are separated by printed coins.",
  setup: { players: 3, seed: 1 },
  given: coinTieBreakPath.slice(0, 17),
  when: [coinTieBreakPath[17]],
  then: ({ expect, state }) => {
    const standings = state().publicState.outcome?.standings ?? [];
    expect(standings[0]?.score).toBe(19);
    expect(standings[1]?.score).toBe(19);
    expect(standings[0]?.tieBreaks?.[0]?.value).toBe(1);
    expect(standings[1]?.tieBreaks?.[0]?.value).toBe(1);
    expect(standings[0]?.tieBreaks?.[1]?.value).toBe(3);
    expect(standings[1]?.tieBreaks?.[1]?.value).toBe(2);
  },
});
