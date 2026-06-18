import { defineScenario } from "../testing-types";
import { patchMatOccupancy, setPlayerResources } from "../scenario-helpers";

// End-game scoring breakdown for seat(0):
//   playerVP (fulfilled orders, pre-set via patchState)  = 5
//   items VP: workbench (1) + workbench (1) + anvil (2)  = 4
//   adjacency VP: 2 wood items orthogonally adjacent
//     contributes 1 wood-pair → +1.
//   coin VP: floor(12 / 5)                                = 2
//   ─────────────────────────────────────────────────────────
//   final VP                                              = 12
export default defineScenario({
  id: "mat-adjacency-scoring-endgame",
  description:
    "Endgame VP = playerVP + items + adjacency pairs + coin/5; winner is set on gameOver.",
  from: "initial-turn",
  when: async ({ game, seat }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    await game.submit(seat0, "selectWakeUpSlot", { spaceId: "wake-up-1" });
    await game.submit(seat1, "selectWakeUpSlot", { spaceId: "wake-up-2" });

    // Force the season counter to 6 so cleanup advances to scoring on
    // the next pass-cycle, and seed the scoring inputs directly.
    await game.patchState((snapshot) => {
      const domain = snapshot.domain as Record<string, unknown>;
      const publicState = domain.publicState as Record<string, unknown>;
      publicState.seasonNumber = 6;
      publicState.playerVP = {
        ...(publicState.playerVP as Record<string, number>),
        [seat0]: 5,
        [seat1]: 0,
      };
    });

    // Mat layout for seat(0): two adjacent workbenches (wood/wood) and a
    // non-adjacent anvil (stone). Adjacency contributes 1 wood-pair only.
    await patchMatOccupancy(game, seat0, [
      ["cell-r0-c0", "workbench"],
      ["cell-r0-c1", "workbench"],
      ["cell-r2-c3", "anvil"],
    ]);

    // Coin = 12 → floor(12/5) = 2 VP.
    await setPlayerResources(game, seat0, { wood: 0, stone: 0, coin: 12 });

    // Both seats pass — cleanup advances season 6 → 7 (overflow),
    // transitions to scoring, scoring transitions to gameOver.
    await game.submit(seat0, "passPlacement");
    await game.submit(seat1, "passPlacement");
  },
  then: ({ expect, view, seat, state }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    expect(state()).toBe("gameOver");

    const seat0View = view(seat0);
    // playerVP is overwritten with the final total.
    // 5 + (1+1+2) + 1 + 2 = 12.
    expect(seat0View.playerVP[seat0]).toBe(12);
    expect(seat0View.playerVP[seat1]).toBe(0);
    expect(seat0View.winnerPlayerId).toBe(seat0);
  },
});
