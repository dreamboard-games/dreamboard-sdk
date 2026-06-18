import { defineScenario } from "../testing-types";
import { givePlayerApprenticeCard } from "../scenario-helpers";

// Guild Scholar: while in tableau, the player draws +1 apprentice card
// on top of the standard guild-hall result (1 order + 1 apprentice).
export default defineScenario({
  id: "card-play-persistent-guild-scholar",
  description:
    "Guild Scholar in tableau: guild-hall now deals +1 extra apprentice card.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await givePlayerApprenticeCard(game, seat0, "guild-scholar");

    // Play guild-scholar → tableau.
    await game.submit(seat0, "playApprenticeCard", {
      cardId: "guild-scholar",
    });

    // Capture the post-play hand size for the differential check.
    // Setup dealt 1 apprentice; givePlayerApprenticeCard added
    // guild-scholar (now removed by play) → 1 in hand.
    // Place on guild-hall: standard +1 apprentice + scholar +1 → 3.
    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-1",
      spaceId: "guild-hall",
    });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    // 1 (setup) + 1 (guild-hall) + 1 (scholar) = 3 apprentice cards.
    expect(v.apprenticeHandCountByPlayerId[seat0]).toBe(3);
    // 1 (setup) + 1 (guild-hall) = 2 order cards.
    expect(v.orderHandCountByPlayerId[seat0]).toBe(2);
  },
});
