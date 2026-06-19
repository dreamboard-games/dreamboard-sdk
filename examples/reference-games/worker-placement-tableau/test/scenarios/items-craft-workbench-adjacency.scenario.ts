import { defineScenario } from "../testing-types.ts";
import { setPlayerResources } from "../scenario-helpers.ts";

// seat(0) crafts an anvil first (no neighbour rule), then a workbench
// adjacent to it (touch-one rule satisfied). Workbench-without-neighbour
// is rejected before the anvil exists.
export default defineScenario({
  id: "items-craft-workbench-adjacency",
  description:
    "Workbench requires a neighbour: rejected on empty mat, succeeds when placed next to an anvil.",
  from: "initial-turn",
  when: async ({ game, seat, expect }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    // Wakeup picks: seat(0) → slot 1 (no bonus), seat(1) → slot 2 (+1 coin).
    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    // Seed enough resources for two crafts and the no-op assertion path.
    await setPlayerResources(game, seat0, {
      wood: 5,
      stone: 5,
      coin: 5,
    });
    await setPlayerResources(game, seat1, {
      wood: 1,
      stone: 0,
      coin: 3,
    });

    // seat(0) places worker on workshop, raising the craft barrier.
    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-1",
      spaceId: "workshop",
    });

    // First craft attempt: workbench on an empty mat fails the touch-one rule.
    await expect(async () => {
      await game.submit(seat0, "craftAtWorkshop", {
        itemId: "workbench",
        cell: {
          boardId: "workshop-mat",
          playerId: seat0,
          spaceId: "cell-r0-c0",
        },
      });
    }).toRejectWith({ errorCode: "MUST_TOUCH_ONE" });

    // Same cell, anvil instead — placement rule "any" succeeds.
    await game.submit(seat0, "craftAtWorkshop", {
      itemId: "anvil",
      cell: {
        boardId: "workshop-mat",
        playerId: seat0,
        spaceId: "cell-r0-c0",
      },
    });

    // seat(1) places a worker so we get back to seat(0).
    await game.submit(seat1, "placeWorker", {
      componentId: "apprentice-p2-1",
      spaceId: "lumberyard",
    });

    // seat(0) places another worker on workshop and crafts the workbench
    // on the cell adjacent to the anvil — touch-one is now satisfied.
    // Using the master so it overrides the still-parked apprentice.
    await game.submit(seat0, "placeWorker", {
      componentId: "master-p1",
      spaceId: "workshop",
    });
    await game.submit(seat0, "craftAtWorkshop", {
      itemId: "workbench",
      cell: {
        boardId: "workshop-mat",
        playerId: seat0,
        spaceId: "cell-r0-c1",
      },
    });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);

    // Both items landed on the mat.
    expect(v.matItemsByPlayerId[seat0]?.["cell-r0-c0"]).toBe("anvil");
    expect(v.matItemsByPlayerId[seat0]?.["cell-r0-c1"]).toBe("workbench");

    // Resources spent: 1 stone (anvil) + 1 wood (workbench) → 5-1=4 wood, 5-1=4 stone, coin unchanged.
    expect(v.myResources.wood).toBe(4);
    expect(v.myResources.stone).toBe(4);
    expect(v.myResources.coin).toBe(5);

    // Craft barrier cleared.
    expect(v.pendingCraftBy).toBeNull();
  },
});
