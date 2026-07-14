import { guildTieBreakPath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.ranking-and-ties-guild-set",
  description: "Equal total scores are separated first by complete guild sets.",
  setup: { players: 3, seed: 27 },
  given: guildTieBreakPath.slice(0, 17),
  when: [guildTieBreakPath[17]],
  then: ({ expect, state }) => {
    const standings = state().publicState.outcome?.standings ?? [];
    expect(standings[0]?.score).toBe(21);
    expect(standings[1]?.score).toBe(21);
    expect(standings[0]?.tieBreaks).toEqual([
      { id: "complete-guild-sets", label: "Complete guild sets", value: 2 },
      { id: "coins", label: "Coins", value: 3 },
    ]);
    expect(standings[1]?.tieBreaks?.[0]?.value).toBe(1);
  },
});
