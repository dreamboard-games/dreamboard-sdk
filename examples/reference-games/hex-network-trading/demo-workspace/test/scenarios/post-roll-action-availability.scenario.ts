import { defineScenario } from "../testing-types";

type ResourceId = "clay" | "grain" | "timber" | "iron" | "cloth";
type ResourceCounts = Record<ResourceId, number>;

const RESOURCES = ["clay", "grain", "timber", "iron", "cloth"] as const;
const CHARTER_CARD_COST: ResourceCounts = {
  clay: 0,
  grain: 1,
  timber: 0,
  iron: 1,
  cloth: 1,
};

function canAffordCharterCard(resources: ResourceCounts): boolean {
  return RESOURCES.every(
    (resource) => resources[resource] >= CHARTER_CARD_COST[resource],
  );
}

function canTradeWithBank(
  resources: ResourceCounts,
  rates: Readonly<Record<ResourceId, number>>,
): boolean {
  return RESOURCES.some((resource) => resources[resource] >= rates[resource]);
}

export default defineScenario({
  id: "post-roll-action-availability",
  description:
    "Action descriptors expose reducer availability after the dice are rolled.",
  from: "after-setup",
  when: async ({ game, seat }) => {
    await game.submit(seat(0), "rollDice", {});
  },
  then: ({ expect, interactions, seat, view }) => {
    const playerId = seat(0);
    const playerView = view(playerId) as {
      myResources: ResourceCounts;
      myBankTradeRates: Readonly<Record<ResourceId, number>>;
    };
    const descriptors = interactions(playerId);
    const byId = (interactionId: string) =>
      descriptors.find(
        (descriptor) => descriptor.interactionId === interactionId,
      );

    expect(byId("buyCharterCard")?.availability.status === "available").toBe(
      canAffordCharterCard(playerView.myResources),
    );
    expect(byId("tradeWithBank")?.availability.status === "available").toBe(
      canTradeWithBank(playerView.myResources, playerView.myBankTradeRates),
    );
    expect(byId("offerTrade")?.availability.status).toBe("available");
  },
});
