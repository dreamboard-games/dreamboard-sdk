import { defineScenario } from "../testing-types";
import {
  craftItem,
  ensureVariableSpaceEnabled,
  passPlacement,
  pickSlot,
  placeApprentice,
  setPlayerResources,
} from "../scenario-helpers";

// Forge: place a worker and craft an item with -1 stone discount,
// no second worker required (parallel to Inspiration's wood discount).
export default defineScenario({
  id: "variable-space-forge",
  description:
    "Forge crafts a kiln (1 wood + 1 stone) at -1 stone → 1 wood + 0 stone.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await pickSlot(game, seat0, 1);
    await pickSlot(game, seat1, 4);

    await ensureVariableSpaceEnabled(game, "forge");
    // 1 wood + 0 stone: kiln cost 1 wood + 1 stone with -1 stone = 1 wood + 0 stone.
    await setPlayerResources(game, seat0, { wood: 1, stone: 0, coin: 2 });

    await placeApprentice(game, seat0, 1, "forge"); // raise forge barrier

    // craftAtWorkshop: kiln on a corner cell. Forge discount lets the
    // 0-stone player still afford it. The craft consumes the
    // placement-turn (Forge is a placement-driven barrier, unlike
    // Inspiration which is a card play); turn advances to seat1.
    await craftItem(game, seat0, "cell-r0-c0", "kiln");

    await passPlacement(game, seat1);
    await passPlacement(game, seat0);
  },
  then: ({ expect, view, seat }) => {
    const seat0 = seat(0);
    const v = view(seat0);
    expect(v.matItemsByPlayerId[seat0]?.["cell-r0-c0"]).toBe("kiln");
    // 1 wood - 1 = 0; 0 stone - 0 = 0 (discount); coin unchanged.
    expect(v.myResources.wood).toBe(0);
    expect(v.myResources.stone).toBe(0);
    expect(v.myResources.coin).toBe(2);
    // Forge barrier cleared after the craft.
    expect(v.forgeActiveBy).toBeNull();
  },
});
