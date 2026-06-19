import type { CardId } from "../../shared/manifest-contract.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "player-one-sketchpad-hand",
  description:
    "Player 1 has a Sketchpad card in hand after buying and cycling.",
  from: "initial-turn",
  runners: ["reducer"],
  async when({ game, seat }) {
    const player1 = seat(0);
    const player2 = seat(1);

    await game.submit(player1, "endActionPhase", {});
    await game.submit(player1, "playAllTreasures", {});
    await game.submit(player1, "buyCard", { cardId: "sketchpad-7" as CardId });
    await game.submit(player1, "endTurn", {});

    await game.submit(player2, "endActionPhase", {});
    await game.submit(player2, "endTurn", {});

    await game.submit(player1, "endActionPhase", {});
    await game.submit(player1, "endTurn", {});
  },
  then: ({ expect, view, seat }) => {
    const player1 = seat(0);

    expect(
      view(player1).handCards.some((cardId) => cardId.startsWith("sketchpad-")),
    ).toBe(true);
  },
});
