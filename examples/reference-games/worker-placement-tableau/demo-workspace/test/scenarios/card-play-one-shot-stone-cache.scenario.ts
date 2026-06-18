import { defineScenario } from "../testing-types";
import { givePlayerApprenticeCard } from "../scenario-helpers";

// Stone Cache: gain 2 stone.
export default defineScenario({
  id: "card-play-one-shot-stone-cache",
  description: "Stone Cache grants +2 stone and discards itself.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await givePlayerApprenticeCard(game, seat0, "stone-cache");

    await game.submit(seat0, "playApprenticeCard", { cardId: "stone-cache" });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    // Setup gives 0 stone; +2 → 2.
    expect(v.myResources.stone).toBe(2);
    expect(v.myApprenticeHand.includes("stone-cache")).toBe(false);
  },
});
