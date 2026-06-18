import { defineScenario } from "../testing-types";
import {
  ensureVariableSpaceEnabled,
  passPlacement,
  pickSlot,
  placeApprentice,
} from "../scenario-helpers";

// Patron's estate: simple resolver, +2 coin + draw 1 Order card.
export default defineScenario({
  id: "variable-space-patrons-estate",
  description:
    "Patron's estate grants +2 coin and deals 1 Order card to the player.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await pickSlot(game, seat0, 1);
    await pickSlot(game, seat1, 4);

    await ensureVariableSpaceEnabled(game, "patrons-estate");

    await placeApprentice(game, seat0, 1, "patrons-estate");
    await passPlacement(game, seat1);
    await passPlacement(game, seat0);
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    // Setup gave 2 coin; patrons-estate +2 → 4.
    expect(v.myResources.coin).toBe(4);
    // Setup dealt 1 order card; patrons-estate dealt +1 → 2.
    expect(v.orderHandCountByPlayerId[seat0]).toBe(2);
  },
});
