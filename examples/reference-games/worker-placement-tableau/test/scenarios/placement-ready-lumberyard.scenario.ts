import { defineScenario } from "../testing-types.ts";

// Stops at the first placement decision so the UI fixture can prove the
// board-space click and submit path for the lumberyard action.
export default defineScenario({
  id: "placement-ready-lumberyard",
  description:
    "Seat 0 has selected the first wake-up slot and is ready to place an apprentice at the lumberyard.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });
  },
  then: ({ expect, view, seat }) => {
    const seat0View = view(seat(0));
    expect(seat0View.currentPhase).toBe("placement");
    expect(seat0View.currentActorPlayerId).toBe(seat(0));
    expect(seat0View.myResources.wood).toBe(1);
  },
});
