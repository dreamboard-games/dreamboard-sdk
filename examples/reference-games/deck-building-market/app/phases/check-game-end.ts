import { definePhase } from "@dreamboard-games/sdk/reducer";
import {
  checkGameEndPhaseStateSchema,
  type GameContract,
} from "../game-contract";
import { vpTotalsByPlayer, winnerOf } from "../derived";
import { edit } from "../reducer-support";

export const checkGameEnd = definePhase<GameContract>()({
  kind: "auto",
  state: checkGameEndPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, derived, fx, q }) {
    const winningPlayerId = derived(winnerOf);

    if (winningPlayerId) {
      const vpTotals = derived(vpTotalsByPlayer);
      const tx = edit(state);
      tx.patchPublicState({
        outcome: {
          reason: {
            code: "SKETCHBOOK_FILLED",
            message: "The sketchbook is filled.",
          },
          standings: q.player.order().map((playerId) => ({
            playerId,
            rank: playerId === winningPlayerId ? 1 : 2,
            result: playerId === winningPlayerId ? "win" : "loss",
            score: vpTotals[playerId] ?? 0,
          })),
        },
      });
      tx.setActivePlayers([]);
      return accept(tx.state, { instructions: [fx.transition("gameOver")] });
    }

    const currentPlayer = state.flow.activePlayers[0];
    const nextPlayer = currentPlayer
      ? (q.player.nextInOrder(currentPlayer) ?? q.player.order()[0])
      : q.player.order()[0];
    if (!nextPlayer) {
      throw new Error("Sketchbook requires at least one player.");
    }

    const tx = edit(state);
    tx.setActivePlayers([nextPlayer]);
    return accept(tx.state, { instructions: [fx.transition("playerTurn")] });
  },
});
