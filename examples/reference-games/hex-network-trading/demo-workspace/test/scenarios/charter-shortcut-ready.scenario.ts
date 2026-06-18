import { defineScenario } from "../testing-types";
import { firstEligibleEdge, readyForCharterCard } from "../scenario-helpers";

export default defineScenario({
  id: "charter-shortcut-ready",
  description: "Materializes a browser-ready state with Shortcut playable",
  from: "charter-verification",
  when: async (ctx) => {
    await readyForCharterCard(ctx, ctx.seat(0), "shortcut");
  },
  then: ({ expect, interactions, seat }) => {
    const descriptor = interactions(seat(0)).find(
      (candidate) => candidate.interactionId === "playShortcut",
    );
    expect(descriptor?.availability.status).toBe("available");
    expect(firstEligibleEdge(descriptor, "edgeIds")).toBeDefined();
  },
});
