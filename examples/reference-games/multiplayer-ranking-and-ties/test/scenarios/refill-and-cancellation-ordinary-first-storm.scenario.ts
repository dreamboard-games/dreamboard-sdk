import { draft } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.refill-and-cancellation-ordinary-first-storm",
  description:
    "A post-draft refill records a first Storm, fills the same market position, then advances the seat.",
  setup: { players: 2, seed: 44 },
  given: [],
  when: [draft(0, "food-p3-c0-2")],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.stormsRevealed).toBe(1);
    expect(final.market.filter((cardId) => cardId !== null)).toHaveLength(4);
    expect(final.activePlayerIndex).toBe(1);
    expect(final.events.slice(-3).map(({ kind }) => kind)).toEqual([
      "stall-drafted",
      "storm-revealed",
      "market-refilled",
    ]);
  },
});
