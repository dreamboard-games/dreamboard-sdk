import { checkGameEnd as checkGameEndAuthoring } from "../authoring";
import { publicInfluenceByPlayer, winnerOf } from "../derived";
import { edit } from "../reducer-support";

export const checkGameEnd = checkGameEndAuthoring.define({
  kind: "auto",
  initialState: () => ({}),
  enter({ state, accept, derived, fx, q }) {
    const winnerPlayerId = derived(winnerOf);

    if (winnerPlayerId) {
      const publicRenown = derived(publicInfluenceByPlayer);
      const finalScores = Object.fromEntries(
        q.player
          .order()
          .map((playerId) => [
            playerId,
            (publicRenown[playerId] ?? 0) +
              (state.publicState.landmarkCards[playerId] ?? 0),
          ]),
      );
      const tx = edit(state);
      tx.patchPublicState({ winnerPlayerId });
      tx.setActivePlayers([]);
      return {
        type: "accept",
        state: tx.state,
        instructions: [fx.transition("gameOver")],
        terminal: {
          winnerPlayerId,
          finalScores,
          reason: "Renown target reached.",
        },
      };
    }

    const tx = edit(state);
    tx.advanceActivePlayer();
    return accept(tx.state, [fx.transition("playerTurn")]);
  },
});
