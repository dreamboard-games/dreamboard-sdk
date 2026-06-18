import { defineScenario } from "../testing-types";
import {
  COST_TOWN,
  canAfford,
  firstEligibleVertex,
  rollIntoMainStep,
  setPlayerResources,
} from "../scenario-helpers";

export default defineScenario({
  id: "upgrade-town-ready",
  description:
    "Materializes a browser-ready state with a paid town upgrade available",
  from: "after-setup",
  when: async (ctx) => {
    const playerId = ctx.seat(0);
    await rollIntoMainStep(ctx, playerId);
    await setPlayerResources(ctx, playerId, {
      clay: 3,
      timber: 3,
      iron: 6,
      cloth: 3,
      grain: 6,
    });
  },
  then: ({ expect, interactions, seat, view }) => {
    const playerId = seat(0);
    const descriptor = interactions(playerId).find(
      (candidate) => candidate.interactionId === "upgradeToTown",
    );
    expect(descriptor?.availability.status).toBe("available");
    expect(firstEligibleVertex(descriptor)).toBeDefined();
    expect(canAfford(view(playerId).myResources, COST_TOWN)).toBe(true);
  },
});
