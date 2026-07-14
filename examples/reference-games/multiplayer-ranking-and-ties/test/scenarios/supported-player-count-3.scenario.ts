import { threePlayerCompletePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.supported-player-count-3",
  description: "Three organizers each draft six stalls in fixed seat order.",
  setup: { players: 3, seed: 2 },
  given: threePlayerCompletePath.slice(0, 17),
  when: [threePlayerCompletePath[17]],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.outcome?.reason.code).toBe("SIX_ROUNDS_COMPLETE");
    expect(final.playerIds).toHaveLength(3);
    for (const playerId of final.playerIds) {
      expect(final.festivalRows[playerId]).toHaveLength(6);
    }
    expect(final.outcome?.standings).toHaveLength(3);
  },
});
