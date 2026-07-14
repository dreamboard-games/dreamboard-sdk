import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.refill-and-cancellation-initial-first-storm",
  description:
    "Ordinary setup skips and records a first Storm while still filling four market stalls.",
  setup: { players: 2, seed: 5 },
  given: [],
  when: [],
  then: ({ expect, interactions, state }) => {
    const final = state().publicState;
    expect(final.completed).toBe(false);
    expect(final.stormsRevealed).toBe(1);
    expect(final.stormHistory).toHaveLength(1);
    expect(final.market.filter((cardId) => cardId !== null)).toHaveLength(4);
    expect(interactions({ seat: 0 })).toHaveLength(1);
  },
});
