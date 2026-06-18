import { defineScenario } from "../testing-types";
import { readyForCharterCard } from "../scenario-helpers";

export default defineScenario({
  id: "charter-scout-ready",
  description: "Materializes a browser-ready state with Scout playable",
  from: "charter-verification",
  when: async (ctx) => {
    await readyForCharterCard(ctx, ctx.seat(0), "scout");
  },
  then: ({ expect, interactions, seat }) => {
    expect(
      interactions(seat(0)).some(
        (descriptor) => descriptor.interactionId === "playScout",
      ),
    ).toBe(true);
  },
});
