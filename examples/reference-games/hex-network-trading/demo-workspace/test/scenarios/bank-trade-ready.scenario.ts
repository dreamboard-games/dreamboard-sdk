import { defineScenario } from "../testing-types";
import { firstChoice, readyForInteraction } from "../scenario-helpers";
import { literals } from "../../shared/manifest-contract";

export default defineScenario({
  id: "bank-trade-ready",
  description:
    "Materializes a browser-ready state with a 4:1 bank trade available",
  from: "after-setup",
  when: async (ctx) => {
    await readyForInteraction(ctx, ctx.seat(0), "tradeWithBank");
  },
  then: ({ expect, interactions, seat, view }) => {
    const playerId = seat(0);
    const descriptor = interactions(playerId).find(
      (candidate) => candidate.interactionId === "tradeWithBank",
    );
    const bankRateResource = literals.resourceIds.find(
      (resourceId) => view(playerId).myBankTradeRates[resourceId] === 4,
    );
    const giveResource = firstChoice(
      descriptor,
      "giveResource",
      (value) => value === bankRateResource,
    );
    expect(descriptor?.availability.status).toBe("available");
    expect(giveResource).toBeDefined();
  },
});
