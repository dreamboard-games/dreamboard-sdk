import { defineScenario } from "../testing-types";
import {
  ensureVariableSpaceEnabled,
  passPlacement,
  pickSlot,
  placeApprentice,
} from "../scenario-helpers";

// Masons' lodge: simple resolver, +1 wood + 1 stone, no barrier.
export default defineScenario({
  id: "variable-space-masons-lodge",
  description:
    "Masons' lodge grants +1 wood + 1 stone in a single placement step (no choice barrier).",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await pickSlot(game, seat0, 1);
    await pickSlot(game, seat1, 4);

    await ensureVariableSpaceEnabled(game, "masons-lodge");

    await placeApprentice(game, seat0, 1, "masons-lodge");
    await passPlacement(game, seat1);
    await passPlacement(game, seat0);
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    // Setup gave 1 wood; masons-lodge +1 → 2.
    expect(v.myResources.wood).toBe(2);
    // Setup gave 0 stone; masons-lodge +1 → 1.
    expect(v.myResources.stone).toBe(1);
  },
});
