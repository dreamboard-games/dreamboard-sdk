import { finalRefillCancellationPath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.refill-and-cancellation-final-refill",
  description:
    "The second Storm revealed by the last draft of round six cancels before normal scoring.",
  setup: { players: 2, seed: 48 },
  checkpoints: {
    cancelled: { segment: "when", completed: 1 },
  },
  given: finalRefillCancellationPath.slice(0, 11),
  when: [finalRefillCancellationPath[11]],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.round).toBe(6);
    expect(final.festivalRows["player-1"]).toHaveLength(6);
    expect(final.festivalRows["player-2"]).toHaveLength(6);
    expect(final.events[final.events.length - 1]).toMatchObject({
      kind: "storm-revealed",
      stormsRevealed: 2,
    });
    expect(final.events.some(({ kind }) => kind === "festival-scored")).toBe(
      false,
    );
    expect(final.outcome?.reason.code).toBe("FESTIVAL_CANCELLED");
  },
});
