import { defineScenario } from "../testing-types";
import { givePlayerOrderCard, patchMatOccupancy } from "../scenario-helpers";

// Grand Atelier: 6+ cells filled → +7 VP. We seed exactly 6 to confirm
// the boundary, and reject when only 5 are filled.
export default defineScenario({
  id: "order-fulfill-grand-atelier-6-cells",
  description:
    "Grand Atelier requires 6 filled cells; 5 rejects, 6 succeeds for +7 VP.",
  from: "initial-turn",
  when: async ({ game, seat, expect }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    // 5 cells — too few.
    await patchMatOccupancy(game, seat0, [
      ["cell-r0-c0", "anvil"],
      ["cell-r0-c1", "anvil"],
      ["cell-r0-c2", "anvil"],
      ["cell-r1-c0", "anvil"],
      ["cell-r1-c1", "anvil"],
    ]);
    await givePlayerOrderCard(game, seat0, "grand-atelier");

    await expect(async () => {
      await game.submit(seat0, "fulfillOrder", { cardId: "grand-atelier" });
    }).toRejectWith({ errorCode: "ORDER_REQUIREMENT_NOT_MET" });

    // Add a 6th cell.
    await patchMatOccupancy(game, seat0, [["cell-r1-c2", "anvil"]]);

    await game.submit(seat0, "fulfillOrder", { cardId: "grand-atelier" });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    expect(v.playerVP[seat0]).toBe(7);
    expect(v.myOrderHand.includes("grand-atelier")).toBe(false);
  },
});
