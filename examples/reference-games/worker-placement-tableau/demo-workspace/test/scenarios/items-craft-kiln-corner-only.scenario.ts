import { defineScenario } from "../testing-types";
import { setPlayerResources } from "../scenario-helpers";

// The kiln has placement rule "corner-only". The mat is 3 rows × 4 cols
// so corners are r0-c0, r0-c3, r2-c0, r2-c3. Anything else rejects.
export default defineScenario({
  id: "items-craft-kiln-corner-only",
  description:
    "Kiln must be placed on a mat corner. Mid-row cells are rejected; r2-c3 succeeds.",
  from: "initial-turn",
  when: async ({ game, seat, expect }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await setPlayerResources(game, seat0, { wood: 5, stone: 5, coin: 5 });
    await setPlayerResources(game, seat1, { wood: 1, stone: 0, coin: 3 });

    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-1",
      spaceId: "workshop",
    });

    // r1-c1 is interior → reject.
    await expect(async () => {
      await game.submit(seat0, "craftAtWorkshop", {
        itemId: "kiln",
        cell: {
          boardId: "workshop-mat",
          playerId: seat0,
          spaceId: "cell-r1-c1",
        },
      });
    }).toRejectWith({ errorCode: "MUST_BE_CORNER" });

    // r2-c3 is the bottom-right corner → success.
    await game.submit(seat0, "craftAtWorkshop", {
      itemId: "kiln",
      cell: {
        boardId: "workshop-mat",
        playerId: seat0,
        spaceId: "cell-r2-c3",
      },
    });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    expect(v.matItemsByPlayerId[seat0]?.["cell-r2-c3"]).toBe("kiln");
    // Kiln cost: 1 wood + 1 stone → 5-1=4 wood, 5-1=4 stone.
    expect(v.myResources.wood).toBe(4);
    expect(v.myResources.stone).toBe(4);
    expect(v.pendingCraftBy).toBeNull();
  },
});
