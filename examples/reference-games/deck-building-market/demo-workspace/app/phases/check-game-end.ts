import { definePhase } from "@dreamboard-games/sdk/reducer";
import {
  checkGameEndPhaseStateSchema,
  type GameContract,
} from "../game-contract";
import { winnerOf } from "../derived";
import { edit } from "../reducer-support";

export const checkGameEnd = definePhase<GameContract>()({
  kind: "auto",
  state: checkGameEndPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, derived, fx, q }) {
    const winnerPlayerId = derived(winnerOf);

    if (winnerPlayerId) {
      const tx = edit(state);
      tx.patchPublicState({ winnerPlayerId });
      tx.setActivePlayers([]);
      return accept(tx.state, [fx.transition("gameOver")]);
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
    return accept(tx.state, [fx.transition("playerTurn")]);
  },
});
