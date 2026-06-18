import { defineScenario } from "../testing-types";
import { givePlayerOrderCard, patchMatOccupancy } from "../scenario-helpers";

// Mixed Set: 1 wood item + 1 stone item → +3 VP, +1 coin.
export default defineScenario({
  id: "order-fulfill-mixed-set",
  description:
    "Mixed Set fulfilment grants +3 VP and +1 coin when the player has at least one wood and one stone item.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await patchMatOccupancy(game, seat0, [
      ["cell-r0-c0", "workbench"], // wood
      ["cell-r1-c1", "anvil"], // stone
    ]);
    await givePlayerOrderCard(game, seat0, "mixed-set");

    await game.submit(seat0, "fulfillOrder", { cardId: "mixed-set" });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    expect(v.playerVP[seat0]).toBe(3);
    // Setup gave 2 coin; mixed-set adds +1 → 3.
    expect(v.myResources.coin).toBe(3);
    expect(v.myOrderHand.includes("mixed-set")).toBe(false);
  },
});
