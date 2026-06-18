import { defineScenario } from "../testing-types";
import { setPlayerResources } from "../scenario-helpers";

// Showroom has placement rule "touch-two". Pre-seed two anvils on
// seat(0)'s mat so the cell at r0-c0 borders both. An isolated cell
// rejects; the doubly-adjacent cell succeeds.
//
// `patchState` is used to plant the anvils because building three
// items in a single placement-phase isn't possible: workshop holds at
// most one apprentice + one master override. The seeded state is
// equivalent to "this is mid-season-3 with two prior crafts".
export default defineScenario({
  id: "items-craft-showroom-multi-adjacency",
  description:
    "Showroom requires two adjacent owned items; isolated cells reject, the doubly-adjacent cell succeeds.",
  from: "initial-turn",
  when: async ({ game, seat, expect }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    // Seed plenty for the showroom plus the cost of crafting.
    await setPlayerResources(game, seat0, { wood: 1, stone: 5, coin: 5 });
    await setPlayerResources(game, seat1, { wood: 1, stone: 0, coin: 3 });

    // Plant two anvils on seat(0)'s mat at r0-c1 and r1-c0.
    await game.patchState((snapshot) => {
      const domain = snapshot.domain as Record<string, unknown>;
      const publicState = domain.publicState as Record<string, unknown>;
      const matOccupancyByPlayer = {
        ...(publicState.matOccupancyByPlayer as Record<string, unknown>),
      };
      matOccupancyByPlayer[seat0] = {
        ...((matOccupancyByPlayer[seat0] as Record<string, unknown>) ?? {}),
        "cell-r0-c1": "anvil",
        "cell-r1-c0": "anvil",
      };
      publicState.matOccupancyByPlayer = matOccupancyByPlayer;
    });

    // seat(0) parks a worker on workshop → craft barrier raised.
    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-1",
      spaceId: "workshop",
    });

    // Isolated corner first — only borders r1-c2 and r2-c2 (both empty).
    await expect(async () => {
      await game.submit(seat0, "craftAtWorkshop", {
        itemId: "showroom",
        cell: {
          boardId: "workshop-mat",
          playerId: seat0,
          spaceId: "cell-r2-c3",
        },
      });
    }).toRejectWith({ errorCode: "MUST_TOUCH_TWO" });

    // r0-c0 borders both seeded anvils → success.
    await game.submit(seat0, "craftAtWorkshop", {
      itemId: "showroom",
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

    expect(v.matItemsByPlayerId[seat0]?.["cell-r0-c0"]).toBe("showroom");
    expect(v.matItemsByPlayerId[seat0]?.["cell-r0-c1"]).toBe("anvil");
    expect(v.matItemsByPlayerId[seat0]?.["cell-r1-c0"]).toBe("anvil");

    // Showroom cost 2 stone + 2 coin → stone 5-2=3, coin 5-2=3.
    expect(v.myResources.stone).toBe(3);
    expect(v.myResources.coin).toBe(3);
    expect(v.pendingCraftBy).toBeNull();
  },
});
