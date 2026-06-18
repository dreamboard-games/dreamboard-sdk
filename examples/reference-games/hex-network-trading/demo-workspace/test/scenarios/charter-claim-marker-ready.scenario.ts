import { defineScenario } from "../testing-types";
import { readyForCharterCard, setPlayerResources } from "../scenario-helpers";

export default defineScenario({
  id: "charter-claim-marker-ready",
  description: "Materializes a browser-ready state with Claim Marker playable",
  from: "charter-verification",
  when: async (ctx) => {
    const playerId = ctx.seat(0);
    await readyForCharterCard(ctx, playerId, "claimMarker");
    await setPlayerResources(ctx, ctx.seat(1), {
      clay: 2,
      timber: 0,
      iron: 0,
      cloth: 0,
      grain: 0,
    });
    await setPlayerResources(ctx, ctx.seat(2), {
      clay: 1,
      timber: 0,
      iron: 0,
      cloth: 0,
      grain: 0,
    });
  },
  then: ({ expect, interactions, seat }) => {
    expect(
      interactions(seat(0)).some(
        (descriptor) => descriptor.interactionId === "playClaimMarker",
      ),
    ).toBe(true);
  },
});
