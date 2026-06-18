import { defineScenario } from "../testing-types";

export default defineScenario({
  id: "cleanup-reshuffle",
  description:
    "When cleanup needs more cards than remain in deck, discard is shuffled back into deck before drawing.",
  from: "initial-turn",
  runners: ["reducer"],
  async when({ game, seat }) {
    const player1 = seat(0);
    const player2 = seat(1);

    await game.submit(player1, "endActionPhase", {});
    await game.submit(player1, "endTurn", {});
    await game.submit(player2, "endActionPhase", {});
    await game.submit(player2, "endTurn", {});
    await game.submit(player1, "endActionPhase", {});
    await game.submit(player1, "endTurn", {});
  },
  then: ({ expect, view, seat }) => {
    const player1 = seat(0);

    expect(view(player1).handCards.length).toBe(5);
    expect(view(player1).deckCount).toBe(5);
    expect(view(player1).discardCards.length).toBe(0);
  },
});
