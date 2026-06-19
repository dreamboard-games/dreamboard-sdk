import { defineScenario } from "../testing-types.ts";
import { readyForCards, setPlayerTurnState } from "../scenario-helpers.ts";

export default defineScenario({
  id: "play-treasures-unavailable",
  description:
    "Play all treasures is unavailable in buy mode when the active player has no treasures in hand.",
  from: "initial-turn",
  runners: ["reducer"],
  async when(ctx) {
    const player1 = ctx.seat(0);
    await readyForCards(ctx, player1, {
      hand: ["idea-3", "brainstorm-3", "masterpiece-1"],
    });
    await setPlayerTurnState(ctx, player1, { step: "buy" });
  },
  then: async ({ expect, game, interactions, seat }) => {
    const player1 = seat(0);
    const descriptor = interactions(player1).find(
      (candidate) => candidate.interactionId === "playAllTreasures",
    );

    expect(descriptor?.availability.status).toBe("blocked");
    if (descriptor?.availability.status === "blocked") {
      expect(descriptor.availability.reason).toBe("No treasures in hand.");
    }
    await expect(game.submit(player1, "playAllTreasures", {})).toRejectWith({
      errorCode: "NO_TREASURES",
    });
  },
});
