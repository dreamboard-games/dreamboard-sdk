import { twoPlayerCompletePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.supported-player-count-2",
  description: "Two organizers each draft six stalls in fixed seat order.",
  setup: { players: 2, seed: 2 },
  given: twoPlayerCompletePath.slice(0, 11),
  when: [twoPlayerCompletePath[11]],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.outcome?.reason.code).toBe("SIX_ROUNDS_COMPLETE");
    expect(final.playerIds).toHaveLength(2);
    expect(final.festivalRows["player-1"]).toHaveLength(6);
    expect(final.festivalRows["player-2"]).toHaveLength(6);
    expect(final.outcome?.standings).toHaveLength(2);
  },
});
