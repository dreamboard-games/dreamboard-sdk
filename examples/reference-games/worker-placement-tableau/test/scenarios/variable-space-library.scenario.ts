import { defineScenario } from "../testing-types.ts";
import {
  chooseLibraryDiscard,
  ensureVariableSpaceEnabled,
  passPlacement,
  pickSlot,
  placeApprentice,
} from "../scenario-helpers.ts";

// Library: draw 2 apprentice cards, then discard one. The kept card
// stays in the player's hand; the discarded one moves to
// apprentice-discard.
export default defineScenario({
  id: "variable-space-library",
  description:
    "Library reveals 2 apprentice cards and the player discards one; the kept one stays in hand.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await pickSlot(game, seat0, 1);
    await pickSlot(game, seat1, 4);

    await ensureVariableSpaceEnabled(game, "library");

    // Place on library — both drawn cards land in apprentice-hand and
    // pendingLibraryDraw[seat0] records the 2 ids.
    await placeApprentice(game, seat0, 1, "library");
    // Read the drawn list off the view to pick which to discard.
    // (We don't know the deal order in advance.)
  },
  then: async ({ expect, view, seat, game }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);
    const v0 = view(seat0);

    // Setup dealt 1; library dealt +2 → 3 cards in hand.
    expect(v0.apprenticeHandCountByPlayerId[seat0]).toBe(3);

    // The 2 drawn ids are surfaced via myPendingLibraryDraw.
    const drawn = v0.myPendingLibraryDraw ?? [];
    expect(drawn.length).toBe(2);

    // Discard the first one. After resolution: hand drops by 1 (kept
    // 1 of the 2 drawn) and the barrier clears.
    await chooseLibraryDiscard(game, seat0, drawn[0]!);
    await passPlacement(game, seat1);
    await passPlacement(game, seat0);

    const finalView = view(seat0);
    expect(finalView.apprenticeHandCountByPlayerId[seat0]).toBe(2);
    expect(finalView.myPendingLibraryDraw).toBeNull();
  },
});
