import { fourPlayerCompletePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.projection-privacy",
  description:
    "Every organizer sees the same public market and festival rows while no view exposes the hidden deck order.",
  setup: { players: 4, seed: 2 },
  given: fourPlayerCompletePath.slice(0, 3),
  when: [fourPlayerCompletePath[3]],
  then: ({ expect, view }) => {
    const first = view({ seat: 0 });
    for (const seat of [1, 2, 3] as const) {
      const other = view({ seat });
      expect(other.market).toEqual(first.market);
      expect(other.festivalRows).toEqual(first.festivalRows);
      expect(JSON.stringify(other).includes("festivalDeck")).toBe(false);
    }
  },
});
