import { defineScenario } from "../testing-types";
import {
  COST_CAMP,
  canAfford,
  firstEligibleEdge,
  firstEligibleVertex,
  rollIntoMainStep,
  setPlayerResources,
} from "../scenario-helpers";

export default defineScenario({
  id: "build-camp-ready",
  description:
    "Materializes a browser-ready state with a paid camp build available",
  from: "after-setup",
  when: async (ctx) => {
    const playerId = ctx.seat(0);
    await rollIntoMainStep(ctx, playerId);
    await setPlayerResources(ctx, playerId, {
      clay: 6,
      timber: 6,
      iron: 6,
      cloth: 6,
      grain: 6,
    });
    const trail = ctx
      .interactions(playerId)
      .find((candidate) => candidate.interactionId === "buildTrail");
    await ctx.game.submit(playerId, "buildTrail", {
      edgeId: firstEligibleEdge(trail),
    });
    await setPlayerResources(ctx, playerId, {
      clay: 6,
      timber: 6,
      iron: 6,
      cloth: 6,
      grain: 6,
    });
  },
  then: ({ expect, interactions, seat, view }) => {
    const playerId = seat(0);
    const descriptor = interactions(playerId).find(
      (candidate) => candidate.interactionId === "buildCamp",
    );
    expect(descriptor?.availability.status).toBe("available");
    expect(firstEligibleVertex(descriptor)).toBeDefined();
    expect(canAfford(view(playerId).myResources, COST_CAMP)).toBe(true);
  },
});
