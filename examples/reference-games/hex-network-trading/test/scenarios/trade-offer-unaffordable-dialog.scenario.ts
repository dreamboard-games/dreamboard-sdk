import { defineScenario } from "../testing-types.ts";

type ResourceCounts = Record<string, number>;

export default defineScenario({
  id: "trade-offer-unaffordable-dialog",
  description:
    "A trade target who lacks the requested resources sees Accept disabled while Reject remains available",
  from: "after-setup",
  when: async ({ game, view, expect, seat }) => {
    const offerer = seat(0);
    const partner = seat(1);

    await game.submit(offerer, "rollDice", {});

    const offererView = view(offerer) as { myResources: ResourceCounts };
    const partnerView = view(partner) as { myResources: ResourceCounts };
    const giveResource = Object.entries(offererView.myResources).find(
      ([, count]) => count > 0,
    )?.[0];
    const wantResource = Object.entries(partnerView.myResources).find(
      ([resource, count]) => count === 0 && resource !== giveResource,
    )?.[0];

    expect(giveResource).toBeDefined();
    expect(wantResource).toBeDefined();

    await game.submit(offerer, "offerTrade", {
      give: { [giveResource!]: 1 },
      want: { [wantResource!]: 1 },
      targetPlayerIds: [partner],
    });
  },
  then: async ({ expect, game, interactions, seat }) => {
    const partner = seat(1);
    const response = interactions(partner).find(
      (descriptor) => descriptor.interactionId === "respondToTrade",
    );

    expect(response?.kind).toBe("action");
    if (response?.kind !== "action") {
      throw new Error("Expected respondToTrade to be an action descriptor.");
    }
    const responseDomain = response.inputs.find(
      (input) => input.key === "response",
    )?.domain;
    if (responseDomain?.type !== "choice") {
      throw new Error("Expected respondToTrade response input to be a choice.");
    }
    expect(responseDomain.choices?.map((option) => option.value)).toEqual([
      "accept",
      "reject",
    ]);

    let rejected = false;
    try {
      await game.submit(partner, "respondToTrade", { response: "accept" });
    } catch (error) {
      rejected = true;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("You don't have the requested resources.")) {
        throw new Error(message);
      }
    }
    expect(rejected).toBe(true);

    await game.submit(partner, "respondToTrade", { response: "reject" });
  },
});
