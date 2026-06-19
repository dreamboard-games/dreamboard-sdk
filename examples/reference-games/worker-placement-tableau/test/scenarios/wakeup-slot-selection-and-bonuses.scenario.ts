import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "wakeup-slot-selection-and-bonuses",
  description:
    "Wake-up: seat(0) picks slot 3 (apprentice card), seat(1) picks slot 1 (no bonus); turn order is [seat(1), seat(0)] for placement.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    // Setup auto-runs on game start; we land in `wakeup` with the
    // initial turn order = [player-1, player-2]. seat(0) goes first.
    await game.submit(seat(0), "selectWakeUpSlot", { spaceId: "wake-up-3" });
    await game.submit(seat(1), "selectWakeUpSlot", { spaceId: "wake-up-1" });
  },
  then: ({ expect, state, view, seat }) => {
    // Both selections processed → phase auto-transitioned to placement.
    expect(state()).toBe("placement");

    const seat0 = seat(0);
    const seat1 = seat(1);

    const seat0View = view(seat0);

    // Lower-numbered slot acts first → seat(1) (slot 1) before seat(0) (slot 3).
    expect(seat0View.turnOrderThisSeason).toEqual([seat1, seat0]);

    // wakeUpSelections is keyed by slotIndex.
    expect(seat0View.wakeUpSelections["1"]).toBe(seat1);
    expect(seat0View.wakeUpSelections["3"]).toBe(seat0);

    // seat(0) took slot 3 → +1 apprentice card. Combined with the 1
    // dealt by setup, they now hold 2.
    expect(seat0View.apprenticeHandCountByPlayerId[seat0]).toBe(2);

    // seat(1) took slot 1 → no bonus. Still 1 apprentice card from setup.
    expect(seat0View.apprenticeHandCountByPlayerId[seat1]).toBe(1);

    // seat(1) still has the post-setup 2 coin + 1 wood (slot 1 grants nothing).
    const seat1View = view(seat1);
    expect(seat1View.myResources.coin).toBe(2);
    expect(seat1View.myResources.wood).toBe(1);
    expect(seat1View.myResources.stone ?? 0).toBe(0);
  },
});
