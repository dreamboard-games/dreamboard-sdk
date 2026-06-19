import { defineScenario } from "../testing-types.ts";

// Master overrides apprentice occupancy: seat(0) parks an apprentice on
// lumberyard, then seat(1) plays the master on the same space. Both
// workers' locations resolve to lumberyard and seat(1) still gets the
// +2 wood resolver kick.
export default defineScenario({
  id: "placement-master-override",
  description:
    "A master worker can be placed on a space already occupied by another player's apprentice.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-1",
      spaceId: "lumberyard",
    });

    // seat(1) places their MASTER on the same space — override allowed.
    await game.submit(seat1, "placeWorker", {
      componentId: "master-p2",
      spaceId: "lumberyard",
    });
  },
  then: ({ expect, state, view, seat }) => {
    expect(state()).toBe("placement");

    const seat0 = seat(0);
    const seat1 = seat(1);

    // seat(0) wood: 1 (setup) + 2 (lumberyard) = 3
    expect(view(seat0).myResources.wood).toBe(3);

    // seat(1) wood: 1 (setup) + 2 (lumberyard from master) = 3
    expect(view(seat1).myResources.wood).toBe(3);
  },
});
