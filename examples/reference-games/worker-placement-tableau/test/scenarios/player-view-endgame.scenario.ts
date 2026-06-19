import { defineScenario } from "../testing-types.ts";
import { setPlayerResources } from "../scenario-helpers.ts";

// Endgame view shape: after scoring runs, finalVPByPlayerId is
// populated AND outcome standings are set. Action availability comes from
// interaction descriptors, which are empty once the game reaches gameOver.
export default defineScenario({
  id: "player-view-endgame",
  description:
    "After scoring, view exposes finalVPByPlayerId and outcome standings, with no gameOver actions.",
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
        [seat0]: 7,
        [seat1]: 2,
      };
    });

    await setPlayerResources(game, seat0, { wood: 0, stone: 0, coin: 0 });
    await setPlayerResources(game, seat1, { wood: 0, stone: 0, coin: 0 });

    await game.submit(seat0, "passPlacement");
    await game.submit(seat1, "passPlacement");
  },
  then: ({ expect, interactions, view, seat, state }) => {
    const seat0 = seat(0);
    const seat1 = seat(1);

    expect(state()).toBe("gameOver");
    const v = view(seat0);

    // Endgame data is populated.
    expect(
      v.outcome?.standings.find((standing) => standing.result === "win")
        ?.playerId,
    ).toBe(seat0);
    expect(v.finalVPByPlayerId === null).toBe(false);
    expect(v.finalVPByPlayerId?.[seat0]).toBe(7);
    expect(v.finalVPByPlayerId?.[seat1]).toBe(2);

    // currentPhase/actor reflect the gameOver phase.
    expect(v.currentPhase).toBe("gameOver");
    expect(v.currentActorPlayerId).toBeNull();

    expect(interactions(seat0)).toHaveLength(0);
  },
});
