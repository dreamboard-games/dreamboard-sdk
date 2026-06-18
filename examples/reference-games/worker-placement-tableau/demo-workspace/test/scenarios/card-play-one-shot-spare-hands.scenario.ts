import { defineScenario } from "../testing-types";
import { givePlayerApprenticeCard } from "../scenario-helpers";

// Spare Hands: place 1 extra apprentice this season. With the default
// roster cap of 2, the 3rd apprentice placement normally rejects with
// ROSTER_EXHAUSTED. After playing Spare Hands the cap effectively
// becomes 3 for one placement.
export default defineScenario({
  id: "card-play-one-shot-spare-hands",
  description:
    "Spare Hands lifts the apprentice roster cap by 1; the 3rd placement is blocked without it and succeeds with it.",
  from: "initial-turn",
  when: async ({ game, seat, expect }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await givePlayerApprenticeCard(game, seat0, "spare-hands");

    // Round 1.
    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-1",
      spaceId: "lumberyard",
    });
    await game.submit(seat1, "placeWorker", {
      componentId: "apprentice-p2-1",
      spaceId: "quarry",
    });

    // Round 2 — seat(0) hits cap-2 with this placement.
    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-2",
      spaceId: "guild-hall",
    });
    await game.submit(seat1, "placeWorker", {
      componentId: "apprentice-p2-2",
      spaceId: "training-hall",
    });

    // Round 3 — seat(0) tries a 3rd apprentice. Without Spare Hands the
    // host runtime won't even surface apprentice-p1-3 as a choice; the
    // reducer rejects.
    await expect(async () => {
      await game.submit(seat0, "placeWorker", {
        componentId: "apprentice-p1-3",
        spaceId: "market",
      });
    }).toRejectWith({ errorCode: "ROSTER_EXHAUSTED" });

    // Play Spare Hands. Then the 3rd placement succeeds.
    await game.submit(seat0, "playApprenticeCard", { cardId: "spare-hands" });
    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-3",
      spaceId: "market",
    });
    // Workshop barrier on market — clear it so the scenario's `then`
    // can inspect a stable state.
    await game.submit(seat0, "chooseMarketAction", { choice: "gain-coin" });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    // The 3rd apprentice landed on market.
    // Setup gave 2 coin, market gain-coin adds +3 → 5.
    expect(v.myResources.coin).toBe(5);
    expect(v.myApprenticeHand.includes("spare-hands")).toBe(false);
  },
});
