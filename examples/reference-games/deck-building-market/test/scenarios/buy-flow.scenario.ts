import type { CardId } from "../../shared/manifest-contract.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "buy-flow",
  description:
    "End action phase, play treasures, then buy an eligible market card.",
  from: "initial-turn",
  runners: ["reducer"],
  async when({ game, interactions, seat }) {
    const playerId = seat(0);

    await game.submit(playerId, "endActionPhase", {});
    await game.submit(playerId, "playAllTreasures", {});

    const buy = interactions(playerId).find(
      (descriptor) => descriptor.interactionId === "buyCard",
    );
    const cardInput = buy?.inputs.find((input) => input.key === "cardId");
    const cardId =
      cardInput?.domain.type === "cardTarget" &&
      cardInput.domain.projection === "resolved"
        ? cardInput.domain.eligibleTargets?.[0]
        : undefined;
    if (!cardId) {
      throw new Error("Expected buyCard to expose an eligible market target.");
    }

    await game.submit(playerId, "buyCard", { cardId: cardId as CardId });
  },
  then: ({ expect, state, view, seat }) => {
    const playerId = seat(0);
    expect(state()).toBe("playerTurn");
    expect(view(playerId).mode).toBe("buy");
    expect(view(playerId).buysLeft).toBe(0);
    expect(view(playerId).discardCards.length > 0).toBe(true);
  },
});
