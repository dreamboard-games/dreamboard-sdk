import { defineScenario } from "../testing-types.ts";
import { firstChoice, readyForInteraction } from "../scenario-helpers.ts";
import { literals } from "../../shared/manifest-contract.ts";

export default defineScenario({
  id: "port-trade-ready",
  description:
    "Materializes a browser-ready state with a relay-port bank trade rate available",
  from: "port-verification",
  when: async (ctx) => {
    await readyForInteraction(ctx, ctx.seat(0), "tradeWithBank");
  },
  then: ({ expect, interactions, seat, view }) => {
    const playerId = seat(0);
    const descriptor = interactions(playerId).find(
      (candidate) => candidate.interactionId === "tradeWithBank",
    );
    const portRateResource = literals.resourceIds.find(
      (resourceId) => view(playerId).myBankTradeRates[resourceId] < 4,
    );
    const giveResource = firstChoice(
      descriptor,
      "giveResource",
      (value) => value === portRateResource,
    );
    expect(descriptor?.availability.status).toBe("available");
    expect(giveResource).toBeDefined();
  },
});
