import { definePhase, type GameOutcome } from "@dreamboard-games/sdk/reducer";
import type { PlayerId } from "../../shared/manifest-contract";
import { sketchbookPhaseStateSchema, type GameContract } from "../game-contract";
import { portfolioScores, supplyEnding } from "../derived";
import { appendHistory, edit } from "../reducer-support";
import { FRESH_TURN } from "./player-turn/state";

export const checkGameEnd = definePhase<GameContract>()({
  kind: "auto",
  state: sketchbookPhaseStateSchema,
  initialState: () => ({ ...FRESH_TURN }),
  enter({ state, accept, endGame, derived, fx, q }) {
    const ending = derived(supplyEnding);
    let next = appendHistory(state, {
      kind: "endCheck",
      actorPlayerId: null,
      cardId: null,
      summary: ending ? `Supply ending observed: ${ending}.` : "No supply ending.",
    });
    if (ending) {
      const scores = derived(portfolioScores);
      const highest = Math.max(...Object.values(scores));
      const winners = q.player
        .order()
        .filter((playerId) => scores[playerId] === highest);
      const outcome: GameOutcome<PlayerId> = {
        reason: {
          code:
            ending === "both"
              ? "SIMULTANEOUS_SUPPLY_END"
              : ending === "masterpiece"
                ? "MASTERPIECE_SUPPLY_EMPTY"
                : "THREE_SUPPLY_PILES_EMPTY",
          message:
            ending === "both"
              ? "The Masterpiece pile and at least three supply piles are empty."
              : ending === "masterpiece"
                ? "The Masterpiece pile is empty."
                : "At least three supply piles are empty.",
        },
        standings: q.player.order().map((playerId) => ({
          playerId,
          rank: winners.includes(playerId) ? 1 : 2,
          result:
            winners.length > 1
              ? "draw"
              : winners[0] === playerId
                ? "win"
                : "loss",
          score: scores[playerId],
        })),
      };
      const tx = edit(next);
      tx.patchPublicState({ outcome });
      tx.setActivePlayers([]);
      next = tx.state;
      return endGame(next, outcome, {
        instructions: [fx.transition("gameOver")],
      });
    }

    const currentPlayerId = state.flow.activePlayers[0];
    const nextPlayerId = currentPlayerId
      ? (q.player.nextInOrder(currentPlayerId) ?? q.player.order()[0])
      : q.player.order()[0];
    if (!nextPlayerId) throw new Error("Sketchbook requires two players.");
    const tx = edit(next);
    tx.setActivePlayers([nextPlayerId]);
    return accept(tx.state, { instructions: [fx.transition("playerTurn")] });
  },
});
