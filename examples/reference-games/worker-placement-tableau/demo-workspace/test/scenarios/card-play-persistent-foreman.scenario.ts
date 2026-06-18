import { defineScenario } from "../testing-types";
import { givePlayerApprenticeCard } from "../scenario-helpers";

// Foreman: while in tableau, lumberyard placements grant +1 wood on top
// of the standard +2.
export default defineScenario({
  id: "card-play-persistent-foreman",
  description:
    "Foreman in tableau: lumberyard now grants +3 wood per placement.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await givePlayerApprenticeCard(game, seat0, "foreman");

    // Play foreman → moves to tableau, no immediate effect.
    await game.submit(seat0, "playApprenticeCard", { cardId: "foreman" });

    // Place an apprentice on lumberyard.
    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-1",
      spaceId: "lumberyard",
    });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    // Setup gave 1 wood; lumberyard +2; foreman +1 → 4.
    expect(v.myResources.wood).toBe(4);
    // Card is now on the player's tableau, not in hand or discard.
    expect(v.myApprenticeHand.includes("foreman")).toBe(false);
  },
});
