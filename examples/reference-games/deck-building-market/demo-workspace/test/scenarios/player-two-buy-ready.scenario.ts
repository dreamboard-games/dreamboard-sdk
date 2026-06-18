import { defineScenario } from "../testing-types";
import { setPlayerTurnState } from "../scenario-helpers";

export default defineScenario({
  id: "player-two-buy-ready",
  description:
    "Materialize player 2 in buy mode with enough coins for affordable supply piles.",
  from: "initial-turn",
  runners: ["reducer"],
  async when(ctx) {
    await setPlayerTurnState(ctx, ctx.seat(1), {
      step: "buy",
      coins: 4,
      buysLeft: 1,
    });
  },
  then: ({ expect, interactions, view, seat }) => {
    const player2 = seat(1);
    const buyCard = interactions(player2).find(
      (candidate) => candidate.interactionId === "buyCard",
    );
    const cardInput = buyCard?.inputs.find((input) => input.key === "cardId");
    const eligibleTargets =
      cardInput?.domain.type === "cardTarget" &&
      cardInput.domain.projection === "resolved"
        ? cardInput.domain.eligibleTargets
        : undefined;

    expect(view(player2).mode).toBe("buy");
    expect(view(player2).coins).toBe(4);
    expect(buyCard?.availability.status).toBe("available");
    expect((eligibleTargets?.length ?? 0) > 0).toBe(true);
  },
});
