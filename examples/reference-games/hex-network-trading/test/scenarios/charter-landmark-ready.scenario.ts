import { defineScenario } from "../testing-types.ts";
import { readyForCharterCard } from "../scenario-helpers.ts";

export default defineScenario({
  id: "charter-landmark-ready",
  description: "Materializes a browser-ready state with landmark playable",
  from: "charter-verification",
  when: async (ctx) => {
    await readyForCharterCard(ctx, ctx.seat(0), "landmark");
  },
  then: ({ expect, interactions, seat, view }) => {
    const playerId = seat(0);
    expect(view(playerId).myCharterCardIds.length).toBeGreaterThanOrEqual(1);
    expect(
      interactions(playerId).some(
        (descriptor) => descriptor.interactionId === "playLandmark",
      ),
    ).toBe(true);
  },
});
