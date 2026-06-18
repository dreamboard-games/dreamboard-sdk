import { defineScenario } from "../testing-types";
import { literals } from "../../shared/manifest-contract";

// Verifies the opening state landed by `app/phases/setup.ts`: each player has
// a 5-card hand and 5 cards left in deck, supply piles reflect dealt starters.
export default defineScenario({
  id: "setup-deal",
  description:
    "After setup, each player has a shuffled 5-card hand and 5 cards left in deck.",
  from: "initial-turn",
  runners: ["reducer"],
  when: async () => undefined,
  then: ({ expect, view, seat }) => {
    const player1 = seat(0);
    const player2 = seat(1);
    expect(view(player1).handCards.length).toBe(5);
    expect(view(player2).handCards.length).toBe(5);
    expect(view(player1).deckCount).toBe(5);
    expect(view(player2).deckCount).toBe(5);
    expect(
      view(player1).handCards.some((cardId) => cardId.startsWith("idea-")),
    ).toBe(true);
    expect(
      view(player2).handCards.some((cardId) => cardId.startsWith("idea-")),
    ).toBe(true);
    const player1OpeningTypes = view(player1)
      .handCards.map((cardId) => literals.cardTypeByCardId[cardId])
      .join(",");
    const player2OpeningTypes = view(player2)
      .handCards.map((cardId) => literals.cardTypeByCardId[cardId])
      .join(",");
    expect(player1OpeningTypes === player2OpeningTypes).toBe(false);
    expect(view(player1).myVp).toBe(3);
    expect(view(player2).myVp).toBe(3);
    expect(view(player1).gameOver).toBe(false);
    expect(view(player2).gameOver).toBe(false);
  },
});
