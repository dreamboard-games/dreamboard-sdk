import { defineScenario } from "../testing-types.ts";
import { givePlayerOrderCard, patchMatOccupancy } from "../scenario-helpers.ts";

// Row of Pride: 3 items in a single row → +5 VP. Test the negative
// (3 items split across rows) and the positive (3 in row 1) cases.
export default defineScenario({
  id: "order-fulfill-row-of-pride-3-in-row",
  description:
    "Row of Pride rejects when 3 items are spread across rows; succeeds when they share a row.",
  from: "initial-turn",
  when: async ({ game, seat, expect }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    // Branch 1: 3 items, one per row — no row has 3.
    await patchMatOccupancy(game, seat0, [
      ["cell-r0-c0", "anvil"],
      ["cell-r1-c0", "anvil"],
      ["cell-r2-c0", "anvil"],
    ]);
    await givePlayerOrderCard(game, seat0, "row-of-pride");

    await expect(async () => {
      await game.submit(seat0, "fulfillOrder", { cardId: "row-of-pride" });
    }).toRejectWith({ errorCode: "NO_FULFILLABLE_ORDER" });

    // Branch 2: 3 items in row 1.
    await patchMatOccupancy(game, seat0, [
      ["cell-r1-c0", "anvil"],
      ["cell-r1-c1", "anvil"],
      ["cell-r1-c2", "anvil"],
    ]);

    await game.submit(seat0, "fulfillOrder", { cardId: "row-of-pride" });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    expect(v.playerVP[seat0]).toBe(5);
    expect(v.myOrderHand.includes("row-of-pride")).toBe(false);
  },
});
