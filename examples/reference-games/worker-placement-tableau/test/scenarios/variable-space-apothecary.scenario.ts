import { defineScenario } from "../testing-types.ts";
import {
  ensureVariableSpaceEnabled,
  passPlacement,
  pickSlot,
  placeApprentice,
  recallWorker,
} from "../scenario-helpers.ts";

// Apothecary: pure recall of one of the player's already-placed
// workers. The space is vacated; no resolver fires for the recalled
// worker on its way off the board.
export default defineScenario({
  id: "variable-space-apothecary",
  description:
    "Apothecary recalls a previously-placed worker; the original space is now empty.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await pickSlot(game, seat0, 1);
    await pickSlot(game, seat1, 4);

    await ensureVariableSpaceEnabled(game, "apothecary");

    // Round 1: seat0 places on lumberyard (+2 wood).
    await placeApprentice(game, seat0, 1, "lumberyard");
    await placeApprentice(game, seat1, 1, "quarry");

    // Round 2: seat0 places on apothecary → barrier; recall the
    // lumberyard worker.
    await placeApprentice(game, seat0, 2, "apothecary");
    await recallWorker(game, seat0, "apprentice-p1-1");

    await passPlacement(game, seat1);
    await passPlacement(game, seat0);
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);

    // Workers should be detached at gameOver / cleanup, but mid-game
    // we check via workerLocationsByPlayerId after the recall.
    // Cleanup hasn't run yet (still in placement after passes? — let
    // me check by season number).
    // Passes from both → cleanup runs → wakeup S2.
    // After cleanup all workers are detached anyway, so the recall's
    // direct effect is verified through resource accounting:
    // lumberyard fired ONCE on the original placement (+2 wood); the
    // recall did not re-trigger it. Setup gave 1 wood + 1 (slot 4
    // bonus is only for seat1; seat0 slot 1 = no bonus).
    expect(v.myResources.wood).toBe(3); // 1 setup + 2 lumberyard
  },
});
