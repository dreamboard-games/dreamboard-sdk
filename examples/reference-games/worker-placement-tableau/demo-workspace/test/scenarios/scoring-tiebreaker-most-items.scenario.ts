import { defineScenario } from "../testing-types";
import { patchMatOccupancy, setPlayerResources } from "../scenario-helpers";

// Tiebreaker: when finalVP is equal, the player with more items on
// their mat wins. Set up:
//   seat(0): playerVP=5, 0 items, 0 coin  → finalVP = 5
//   seat(1): playerVP=3, 1 anvil (2 VP), 0 coin → finalVP = 5
// Both finalVP=5; seat(1) has 1 item vs seat(0)'s 0 → seat(1) wins.
export default defineScenario({
  id: "scoring-tiebreaker-most-items",
  description:
    "With equal finalVP, the player with more crafted items wins by tiebreaker.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    await game.patchState((snapshot) => {
      const domain = snapshot.domain as Record<string, unknown>;
      const publicState = domain.publicState as Record<string, unknown>;
      publicState.seasonNumber = 6;
      publicState.playerVP = {
        ...(publicState.playerVP as Record<string, number>),
        [seat0]: 5,
        [seat1]: 3,
      };
    });

    await patchMatOccupancy(game, seat1, [["cell-r0-c0", "anvil"]]);

    await setPlayerResources(game, seat0, { wood: 0, stone: 0, coin: 0 });
    await setPlayerResources(game, seat1, { wood: 0, stone: 0, coin: 0 });

    await game.submit(seat0, "passPlacement");
    await game.submit(seat1, "passPlacement");
  },
  then: ({ expect, view, seat, state }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    expect(state()).toBe("gameOver");
    const v = view(seat0);
    // Both finalVP == 5: seat(0) = 5+0+0+0 = 5; seat(1) = 3+2+0+0 = 5.
    expect(v.playerVP[seat0]).toBe(5);
    expect(v.playerVP[seat1]).toBe(5);
    // seat(1) has 1 item, seat(0) has 0 → seat(1) wins.
    expect(v.winnerPlayerId).toBe(seat1);
  },
});
