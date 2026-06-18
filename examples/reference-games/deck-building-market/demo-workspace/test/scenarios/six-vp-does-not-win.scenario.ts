import type { CardId } from "../../shared/manifest-contract";
import { defineScenario } from "../testing-types";

function findEligibleCard(
  buy:
    | {
        inputs: readonly {
          key: string;
          domain:
            | {
                type: "cardTarget";
                projection: "resolved";
                eligibleTargets: readonly string[];
              }
            | { type: string };
        }[];
      }
    | undefined,
  prefix: string,
) {
  const cardInput = buy?.inputs.find((input) => input.key === "cardId");
  if (
    !cardInput ||
    cardInput.domain.type !== "cardTarget" ||
    !("projection" in cardInput.domain) ||
    cardInput.domain.projection !== "resolved"
  ) {
    return undefined;
  }
  return cardInput.domain.eligibleTargets?.find((cardId: string) =>
    cardId.startsWith(prefix),
  );
}

export default defineScenario({
  id: "six-vp-does-not-win",
  description:
    "Buying a Concept brings the starter score to 6 VP but does not end the game.",
  from: "initial-turn",
  runners: ["reducer"],
  async when({ game, interactions, seat, view }) {
    const player1 = seat(0);
    const player2 = seat(1);

    for (let turn = 0; turn < 20; turn += 1) {
      await game.submit(player1, "endActionPhase", {});
      await game.submit(player1, "playAllTreasures", {});

      const buy = interactions(player1).find(
        (descriptor) => descriptor.interactionId === "buyCard",
      );
      const conceptId = findEligibleCard(buy, "concept-");
      if (conceptId && view(player1).coins >= 5) {
        await game.submit(player1, "buyCard", { cardId: conceptId as CardId });
        return;
      }

      const sketchId = findEligibleCard(buy, "sketch-");
      if (sketchId && view(player1).coins >= 3) {
        await game.submit(player1, "buyCard", { cardId: sketchId as CardId });
      }

      await game.submit(player1, "endTurn", {});
      await game.submit(player2, "endActionPhase", {});
      await game.submit(player2, "endTurn", {});
    }

    throw new Error("Expected player 1 to afford a Concept within 20 turns.");
  },
  then: ({ expect, state, view, seat }) => {
    const playerId = seat(0);
    expect(state()).toBe("playerTurn");
    expect(view(playerId).myVp).toBe(6);
    expect(view(playerId).gameOver).toBe(false);
    expect(view(playerId).winnerPlayerId).toBe(null);
  },
});
