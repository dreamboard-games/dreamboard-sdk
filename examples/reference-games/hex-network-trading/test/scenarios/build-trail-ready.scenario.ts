import { defineScenario } from "../testing-types.ts";
import {
  COST_TRAIL,
  canAfford,
  firstEligibleEdge,
  rollIntoMainStep,
  setPlayerResources,
} from "../scenario-helpers.ts";

export default defineScenario({
  id: "build-trail-ready",
  description:
    "Materializes a browser-ready state with a paid trail build available",
  from: "after-setup",
  when: async (ctx) => {
    const playerId = ctx.seat(0);
    await rollIntoMainStep(ctx, playerId);
    await setPlayerResources(ctx, playerId, {
      clay: 3,
      timber: 3,
      iron: 3,
      cloth: 3,
      grain: 3,
    });
  },
  then: ({ expect, interactions, seat, view }) => {
    const playerId = seat(0);
    const descriptor = interactions(playerId).find(
      (candidate) => candidate.interactionId === "buildTrail",
    );
    expect(descriptor?.availability.status).toBe("available");
    expect(firstEligibleEdge(descriptor)).toBeDefined();
    expect(canAfford(view(playerId).myResources, COST_TRAIL)).toBe(true);
  },
});
