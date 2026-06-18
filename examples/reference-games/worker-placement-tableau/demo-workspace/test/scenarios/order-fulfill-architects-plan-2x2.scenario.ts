import { defineScenario } from "../testing-types";
import { givePlayerOrderCard, patchMatOccupancy } from "../scenario-helpers";

// Architect's Plan: 4 items in a 2x2 → +6 VP. We test BOTH branches:
//   1. Plant 4 items NOT in a 2x2 (corners) → no order is fulfillable.
//   2. Move them into a 2x2 block → fulfilment succeeds.
export default defineScenario({
  id: "order-fulfill-architects-plan-2x2",
  description:
    "Architect's Plan rejects when 4 items are scattered; succeeds when they form a 2x2 block.",
  from: "initial-turn",
  when: async ({ game, seat, expect }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    // Branch 1: 4 items at the four mat corners — no 2x2 possible.
    await patchMatOccupancy(game, seat0, [
      ["cell-r0-c0", "anvil"],
      ["cell-r0-c3", "anvil"],
      ["cell-r2-c0", "anvil"],
      ["cell-r2-c3", "anvil"],
    ]);
    await givePlayerOrderCard(game, seat0, "architects-plan");

    await expect(async () => {
      await game.submit(seat0, "fulfillOrder", {
        cardId: "architects-plan",
      });
    }).toRejectWith({ errorCode: "NO_FULFILLABLE_ORDER" });

    // Branch 2: re-seed a tight 2x2 block and retry.
    await patchMatOccupancy(game, seat0, [
      ["cell-r0-c0", "anvil"],
      ["cell-r0-c1", "anvil"],
      ["cell-r1-c0", "anvil"],
      ["cell-r1-c1", "anvil"],
    ]);

    await game.submit(seat0, "fulfillOrder", { cardId: "architects-plan" });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    expect(v.playerVP[seat0]).toBe(6);
    expect(v.myOrderHand.includes("architects-plan")).toBe(false);
  },
});
