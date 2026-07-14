import { fourPlayerCompletePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.supported-player-count-4",
  description: "Four organizers each draft six stalls in fixed seat order.",
  setup: { players: 4, seed: 2 },
  given: fourPlayerCompletePath.slice(0, 23),
  when: [fourPlayerCompletePath[23]],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.outcome?.reason.code).toBe("SIX_ROUNDS_COMPLETE");
    expect(final.playerIds).toHaveLength(4);
    for (const playerId of final.playerIds) {
      expect(final.festivalRows[playerId]).toHaveLength(6);
    }
    expect(final.outcome?.standings).toHaveLength(4);
  },
});
