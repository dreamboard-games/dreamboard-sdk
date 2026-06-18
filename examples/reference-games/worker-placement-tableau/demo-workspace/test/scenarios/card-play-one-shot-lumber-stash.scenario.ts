import { defineScenario } from "../testing-types";
import { givePlayerApprenticeCard } from "../scenario-helpers";

// Lumber Stash: gain 3 wood.
export default defineScenario({
  id: "card-play-one-shot-lumber-stash",
  description: "Lumber Stash grants +3 wood and discards itself.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await givePlayerApprenticeCard(game, seat0, "lumber-stash");

    await game.submit(seat0, "playApprenticeCard", {
      cardId: "lumber-stash",
    });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    // Setup gives 1 wood; +3 → 4.
    expect(v.myResources.wood).toBe(4);
    expect(v.myApprenticeHand.includes("lumber-stash")).toBe(false);
  },
});
