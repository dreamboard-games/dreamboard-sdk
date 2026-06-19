import { defineScenario } from "../testing-types.ts";
import {
  givePlayerApprenticeCard,
  setPlayerResources,
} from "../scenario-helpers.ts";

// Inspiration: craft 1 item this turn at -1 wood cost; no Workshop
// worker required. The kiln normally costs 1 wood + 1 stone; with the
// discount it costs 0 wood + 1 stone. We seed seat(0) with 1 stone (and
// no extra wood) so the wood-discount-to-zero path is exercised.
export default defineScenario({
  id: "card-play-one-shot-inspiration",
  description:
    "Inspiration craft skips the Workshop worker and reduces wood cost by 1; kiln succeeds with 0 wood + 1 stone.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    // 0 wood + 1 stone → after kiln (0w + 1s) → 0/0.
    await setPlayerResources(game, seat0, { wood: 0, stone: 1, coin: 2 });
    await givePlayerApprenticeCard(game, seat0, "inspiration");

    await game.submit(seat0, "playApprenticeCard", { cardId: "inspiration" });

    // Craft kiln on a corner cell — no Workshop worker.
    await game.submit(seat0, "craftAtWorkshop", {
      itemId: "kiln",
      cell: {
        boardId: "workshop-mat",
        playerId: seat0,
        spaceId: "cell-r0-c0",
      },
    });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    expect(v.matItemsByPlayerId[seat0]?.["cell-r0-c0"]).toBe("kiln");
    // Wood: 0 -> 0 (discount); stone: 1 -> 0; coin unchanged.
    expect(v.myResources.wood).toBe(0);
    expect(v.myResources.stone).toBe(0);
    expect(v.myResources.coin).toBe(2);
    expect(v.myApprenticeHand.includes("inspiration")).toBe(false);
    // Inspiration flag is cleared after the craft.
    expect(v.pendingCraftBy).toBeNull();
  },
});
