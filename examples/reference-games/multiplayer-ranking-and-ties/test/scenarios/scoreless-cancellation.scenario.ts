import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.scoreless-cancellation",
  description:
    "Cancellation publishes only rank-one draws and never provisional numeric evidence.",
  setup: { players: 4, seed: 17 },
  given: [],
  when: [],
  then: ({ expect, state }) => {
    const outcome = state().publicState.outcome;
    expect(outcome?.reason.code).toBe("FESTIVAL_CANCELLED");
    expect(outcome?.standings).toHaveLength(4);
    for (const standing of outcome?.standings ?? []) {
      expect(standing).toEqual({
        playerId: standing.playerId,
        rank: 1,
        result: "draw",
      });
      expect(standing.score).toBe(undefined);
      expect(standing.scoreBreakdown).toBe(undefined);
      expect(standing.tieBreaks).toBe(undefined);
    }
  },
});
