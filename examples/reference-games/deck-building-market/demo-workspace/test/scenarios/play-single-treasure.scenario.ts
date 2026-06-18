import { defineScenario } from "../testing-types";
import { readyForCards, setPlayerTurnState } from "../scenario-helpers";

export default defineScenario({
  id: "play-single-treasure",
  description:
    "In the buy step a treasure can be played individually for its coins.",
  from: "initial-turn",
  runners: ["reducer"],
  async when(ctx) {
    const player1 = ctx.seat(0);
    await readyForCards(ctx, player1, { hand: ["doodle-1", "sketch-1"] });
    await setPlayerTurnState(ctx, player1, { step: "buy", coins: 0 });

    await ctx.game.submit(player1, "playTreasure", { cardId: "doodle-1" });
    ctx.expect(ctx.view(player1).coins).toBe(1);

    await ctx.game.submit(player1, "playTreasure", { cardId: "sketch-1" });
    ctx.expect(ctx.view(player1).coins).toBe(3);
  },
  then: ({ expect, view, seat }) => {
    const player1 = seat(0);
    expect(view(player1).inPlayCards).toEqual(["doodle-1", "sketch-1"]);
    expect(view(player1).handCards).toHaveLength(0);
  },
});
