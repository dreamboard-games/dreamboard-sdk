import { defineScenario } from "../testing-types";
import { readyForCards, setPlayerTurnState } from "../scenario-helpers";

export default defineScenario({
  id: "unavailable-card-actions",
  description:
    "Action cards remain projected but unavailable when the active player has no actions.",
  from: "initial-turn",
  runners: ["reducer"],
  async when(ctx) {
    const player1 = ctx.seat(0);
    await readyForCards(ctx, player1, { hand: ["brainstorm-3"] });
    await setPlayerTurnState(ctx, player1, { actionsLeft: 0 });
  },
  then: async ({ expect, seat, game }) => {
    await expect(
      game.submit(seat(0), "brainstorm", { cardId: "brainstorm-3" }),
    ).toRejectWith({ errorCode: "NO_ACTIONS" });
  },
});
