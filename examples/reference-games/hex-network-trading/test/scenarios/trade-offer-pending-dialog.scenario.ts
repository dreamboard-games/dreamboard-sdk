import { defineScenario } from "../testing-types.ts";

type ResourceCounts = Record<string, number>;

export default defineScenario({
  id: "trade-offer-pending-dialog",
  description:
    "Offerer has opened a player trade and the target captain still has a response form",
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
      ([resource, count]) => count > 0 && resource !== giveResource,
    )?.[0];

    expect(giveResource).toBeDefined();
    expect(wantResource).toBeDefined();

    await game.submit(offerer, "offerTrade", {
      give: { [giveResource!]: 1 },
      want: { [wantResource!]: 1 },
      targetPlayerIds: [partner],
    });
  },
  then: ({ expect, interactions, view, seat }) => {
    const offerer = seat(0);
    const partner = seat(1);
    const offererView = view(offerer) as { pendingTrade: unknown };
    const partnerView = view(partner) as { pendingTrade: unknown };

    expect(Boolean(offererView.pendingTrade)).toBe(true);
    expect(Boolean(partnerView.pendingTrade)).toBe(true);

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
  },
});
