import { defineScenario } from "../testing-types";
import { givePlayerApprenticeCard } from "../scenario-helpers";

// Quick Delivery: gain 3 coin, card → apprentice-discard.
export default defineScenario({
  id: "card-play-one-shot-quick-delivery",
  description: "Quick Delivery grants +3 coin and discards itself.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await givePlayerApprenticeCard(game, seat0, "quick-delivery");

    await game.submit(seat0, "playApprenticeCard", {
      cardId: "quick-delivery",
    });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    // Setup gives 2 coin; +3 → 5.
    expect(v.myResources.coin).toBe(5);
    expect(v.myApprenticeHand.includes("quick-delivery")).toBe(false);
  },
});
