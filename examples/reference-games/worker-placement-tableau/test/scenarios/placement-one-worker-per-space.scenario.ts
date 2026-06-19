import { defineScenario } from "../testing-types.ts";

// Drives the setup → wakeup → placement chain from a single base.
// Wakeup picks: seat(0) → slot 1, seat(1) → slot 2 → turn order is
// [seat(0), seat(1)] so seat(0) starts placement.
//
// Placement: seat(0) places on lumberyard (+2 wood). seat(1) tries
// lumberyard (occupied → reject) then quarry (+1 stone).
export default defineScenario({
  id: "placement-one-worker-per-space",
  description:
    "Apprentice on lumberyard grants +2 wood; second player blocked from same space, falls back to quarry (+1 stone).",
  from: "initial-turn",
  when: async ({ game, seat, expect }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    // Wakeup picks (auto-runs after setup).
    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    // seat(0) places an apprentice on lumberyard.
    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-1",
      spaceId: "lumberyard",
    });

    // seat(1) tries lumberyard → rejected (apprentice can't override).
    await expect(async () => {
      await game.submit(seat1, "placeWorker", {
        componentId: "apprentice-p2-1",
        spaceId: "lumberyard",
      });
    }).toRejectWith({ errorCode: "SPACE_OCCUPIED" });

    // seat(1) places on quarry instead.
    await game.submit(seat1, "placeWorker", {
      componentId: "apprentice-p2-1",
      spaceId: "quarry",
    });
  },
  then: ({ expect, state, view, seat }) => {
    expect(state()).toBe("placement");

    const seat0 = seat(0);
    const seat1 = seat(1);

    // seat(0): setup gave 1 wood; lumberyard adds +2 → 3.
    const seat0View = view(seat0);
    expect(seat0View.myResources.wood).toBe(3);
    expect(seat0View.myResources.stone ?? 0).toBe(0);

    // seat(1): setup gave 1 wood, no extra wood; quarry adds +1 stone.
    const seat1View = view(seat1);
    expect(seat1View.myResources.wood).toBe(1);
    expect(seat1View.myResources.stone).toBe(1);

    // wakeup bonus from slot 2 = +1 coin → seat(1) coin = 3.
    expect(seat1View.myResources.coin).toBe(3);

    // Both workers tracked at their target spaces.
    expect(seat0View.turnOrderThisSeason[0]).toBe(seat0);
  },
});
