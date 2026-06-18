import { defineScenario } from "../testing-types";
import { givePlayerOrderCard, patchMatOccupancy } from "../scenario-helpers";

// Furniture Commission: 2 wood items on mat → +3 VP, no coin.
// We seed a workbench + a loom on non-adjacent cells so the wood-item
// count matches and the order requirement triggers without depending
// on placement-rule adjacency.
export default defineScenario({
  id: "order-fulfill-furniture-commission",
  description:
    "Two wood items satisfy Furniture Commission; fulfilling the card discards it and grants +3 VP.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    // Seed two wood items + the order card.
    await patchMatOccupancy(game, seat0, [
      ["cell-r0-c0", "workbench"],
      ["cell-r2-c3", "loom"],
    ]);
    await givePlayerOrderCard(game, seat0, "furniture-commission");

    await game.submit(seat0, "fulfillOrder", {
      cardId: "furniture-commission",
    });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);

    expect(v.playerVP[seat0]).toBe(3);

    // Card has left the player's hand.
    expect(v.myOrderHand.includes("furniture-commission")).toBe(false);
  },
});
