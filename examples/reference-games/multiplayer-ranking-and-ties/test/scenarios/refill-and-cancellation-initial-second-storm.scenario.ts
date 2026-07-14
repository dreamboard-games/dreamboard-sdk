import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.refill-and-cancellation-initial-second-storm",
  description:
    "A seeded initial refill reveals two Storms and cancels before any organizer drafts.",
  setup: { players: 2, seed: 17 },
  given: [],
  when: [],
  then: ({ expect, interactions, state }) => {
    const domain = state();
    const final = domain.publicState;
    expect(domain.flow.currentPhase).toBe("gameOver");
    expect(final.stormHistory).toEqual(["storm-2", "storm-1"]);
    expect(final.outcome?.reason.code).toBe("FESTIVAL_CANCELLED");
    expect(final.festivalRows["player-1"]).toHaveLength(0);
    expect(final.festivalRows["player-2"]).toHaveLength(0);
    expect(interactions({ seat: 0 })).toHaveLength(0);
  },
});
