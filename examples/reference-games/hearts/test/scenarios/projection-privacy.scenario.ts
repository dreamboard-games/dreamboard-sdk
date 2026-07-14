import { completeGamePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.projection-privacy",
  description:
    "Pass choices stay sealed, each player sees only their own hand, and public counts/history match for every perspective.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: completeGamePath.slice(0, 2),
  when: completeGamePath.slice(2, 4),
  then: ({ expect, view }) => {
    const first = view({ seat: 0 });
    expect(first.hand.some(({ id }) => id === "diamonds-4")).toBe(true);
    expect(first.hand.some(({ id }) => id === "clubs-6")).toBe(false);
    expect(JSON.stringify(view({ seat: 1 })).includes("diamonds-4")).toBe(
      false,
    );
    for (const seat of [1, 2, 3] as const) {
      const other = view({ seat });
      expect(other.handCountByPlayer).toEqual(first.handCountByPlayer);
      expect(other.trickHistory).toEqual(first.trickHistory);
      expect(other.hand).toHaveLength(13);
    }
    expect("draw-pile" in first).toBe(false);
    expect("deck" in first).toBe(false);
  },
});
