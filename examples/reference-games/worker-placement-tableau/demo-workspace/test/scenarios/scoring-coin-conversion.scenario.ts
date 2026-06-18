import { defineScenario } from "../testing-types";
import { setPlayerResources } from "../scenario-helpers";

// Scoring contribution from coin only: floor(coin/5). Empty mat,
// playerVP = 0 → finalVP = floor(coin/5).
export default defineScenario({
  id: "scoring-coin-conversion",
  description:
    "With no items and no fulfilled orders, finalVP collapses to floor(coin/5).",
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
        [seat0]: 0,
        [seat1]: 0,
      };
    });

    // seat(0) coin 14 → floor(14/5) = 2 VP. seat(1) coin 0 → 0 VP.
    await setPlayerResources(game, seat0, { wood: 0, stone: 0, coin: 14 });
    await setPlayerResources(game, seat1, { wood: 0, stone: 0, coin: 0 });

    await game.submit(seat0, "passPlacement");
    await game.submit(seat1, "passPlacement");
  },
  then: ({ expect, view, seat, state }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    expect(state()).toBe("gameOver");
    const v = view(seat0);
    expect(v.playerVP[seat0]).toBe(2);
    expect(v.playerVP[seat1]).toBe(0);
    expect(
      v.outcome?.standings.find((standing) => standing.result === "win")
        ?.playerId,
    ).toBe(seat0);
  },
});
