import { defineScenario } from "../testing-types.ts";
import { givePlayerApprenticeCard } from "../scenario-helpers.ts";

// Reassign: recall a placed worker and re-place on a different empty
// space. The new space's resolver does NOT fire a second time (rule.md:
// pure relocation).
export default defineScenario({
  id: "card-play-one-shot-reassign",
  description:
    "Reassign moves a placed worker from lumberyard to quarry without re-triggering either resolver.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await givePlayerApprenticeCard(game, seat0, "reassign");

    // seat(0) places on lumberyard → +2 wood (1 + 2 = 3).
    await game.submit(seat0, "placeWorker", {
      componentId: "apprentice-p1-1",
      spaceId: "lumberyard",
    });
    // seat(1) plays so the cycle returns to seat(0).
    await game.submit(seat1, "placeWorker", {
      componentId: "apprentice-p2-1",
      spaceId: "guild-hall",
    });

    // Reassign: from lumberyard → to quarry. Pure relocation; no extra
    // resources granted. Wood stays at 3; stone stays at 0.
    await game.submit(seat0, "reassign", {
      cardId: "reassign",
      pieceId: "apprentice-p1-1",
      toSpaceId: "quarry",
    });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);

    // Resources unchanged from the original lumberyard placement —
    // reassign does NOT re-trigger quarry's +1 stone, and lumberyard's
    // +2 wood from the original placement is still in the bank.
    expect(v.myResources.wood).toBe(3);
    expect(v.myResources.stone ?? 0).toBe(0);
    expect(v.myApprenticeHand.includes("reassign")).toBe(false);
  },
});
