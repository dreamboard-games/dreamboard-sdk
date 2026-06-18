import { defineScenario } from "../testing-types";
import { givePlayerApprenticeCard } from "../scenario-helpers";

// Tireless Master: master placed twice per season. On the player's NEXT
// placement turn after a master placement, the master is auto-recalled
// (vacating its space) and the player may re-place it as their action
// this turn.
export default defineScenario({
  id: "card-play-persistent-tireless-master",
  description:
    "Tireless Master: seat(0) places master on quarry, then on their next placement turn the master is recalled and re-placed on lumberyard (master overrides seat(1)'s apprentice).",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await givePlayerApprenticeCard(game, seat0, "tireless-master");

    // Play tireless-master → tableau.
    await game.submit(seat0, "playApprenticeCard", {
      cardId: "tireless-master",
    });

    // seat(0) places master on quarry → +1 stone. The Tireless Master
    // onPlaceWorker hook records "quarry" in tirelessMasterPendingRecall.
    await game.submit(seat0, "placeWorker", {
      componentId: "master-p1",
      spaceId: "quarry",
    });

    // seat(1) plays an apprentice on lumberyard (between rounds).
    await game.submit(seat1, "placeWorker", {
      componentId: "apprentice-p2-1",
      spaceId: "lumberyard",
    });

    // seat(0)'s next placement turn: the recall fires automatically at
    // the start of `placeWorker.reduce`. We submit the master again,
    // overriding seat(1)'s apprentice on lumberyard. The placement
    // resolver fires again → +2 wood.
    await game.submit(seat0, "placeWorker", {
      componentId: "master-p1",
      spaceId: "lumberyard",
    });
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);

    // Resources: setup wood 1 + lumberyard +2 = 3; quarry +1 stone.
    expect(v.myResources.wood).toBe(3);
    expect(v.myResources.stone).toBe(1);
    expect(v.myApprenticeHand.includes("tireless-master")).toBe(false);
  },
});
