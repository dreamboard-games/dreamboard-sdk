import { defineScenario } from "../testing-types.ts";
import { givePlayerApprenticeCard } from "../scenario-helpers.ts";

// Patron's Favor: in tableau, +1 coin at the end of each season. We
// drive both seats to pass, triggering the cleanup phase whose
// `onSeasonEnd` hook fires the +1 coin, and assert seat(0) now has the
// extra coin while the cleanup transition has advanced to wakeup-2.
export default defineScenario({
  id: "card-play-persistent-patrons-favor",
  description:
    "Patron's Favor in tableau: seat(0) gains +1 coin when cleanup runs at season end.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await givePlayerApprenticeCard(game, seat0, "patrons-favor");

    // Play patron's-favor → tableau.
    await game.submit(seat0, "playApprenticeCard", {
      cardId: "patrons-favor",
    });

    // Both seats pass to drain placement and trigger cleanup. The
    // cleanup `onEnter` runs the season-end hook, recalls workers,
    // bumps the season counter, and transitions to wakeup.
    await game.submit(seat0, "passPlacement");
    await game.submit(seat1, "passPlacement");
  },
  then: ({ expect, view, seat, state }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    // After cleanup, the runtime should land in `wakeup` for season 2.
    expect(state()).toBe("wakeup");
    expect(v.seasonNumber).toBe(2);

    // Setup gave 2 coin; wakeup-1 had no bonus; patron's-favor +1 → 3.
    expect(v.myResources.coin).toBe(3);
  },
});
