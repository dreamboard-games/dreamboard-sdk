import { defineScenario } from "../testing-types";

// Direct cost↔reward verification for the lumberyard fixed action space.
// Setup grants 1 wood; lumberyard +2 wood → 3.
export default defineScenario({
  id: "placement-space-resolution-lumberyard",
  description:
    "Lumberyard resolver grants +2 wood: seat(0) starts with 1 wood and ends with 3.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    // Pre-state: seat(0) wood = 1 (from setup).
    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-1",
      spaceId: "lumberyard",
    });
  },
  then: ({ expect, view, seat }) => {
    expect(view(seat(0)).myResources.wood).toBe(3);
  },
});
