import { checkGameEnd as checkGameEndAuthoring } from "../authoring";
import { publicInfluenceByPlayer, winnerOf } from "../derived";
import { edit } from "../reducer-support";

export const checkGameEnd = checkGameEndAuthoring.define({
  kind: "auto",
  initialState: () => ({}),
  enter({ state, accept, endGame, derived, fx, q }) {
    const winningPlayerId = derived(winnerOf);

    if (winningPlayerId) {
      const publicRenown = derived(publicInfluenceByPlayer);
      const finalRenownScores = Object.fromEntries(
        q.player
          .order()
          .map((playerId) => [
            playerId,
            (publicRenown[playerId] ?? 0) +
              (state.publicState.landmarkCards[playerId] ?? 0),
          ]),
      );
      const outcome = {
        reason: {
          code: "RENOWN_TARGET_REACHED",
          message: "Renown target reached.",
        },
        standings: q.player.order().map((playerId) => ({
          playerId,
          rank: playerId === winningPlayerId ? 1 : 2,
          result: playerId === winningPlayerId ? "win" : "loss",
          score: finalRenownScores[playerId] ?? 0,
          scoreBreakdown: [
            {
              id: "public-renown",
              label: "Public renown",
              value: publicRenown[playerId] ?? 0,
            },
            {
              id: "landmark-cards",
              label: "Landmark cards",
              value: state.publicState.landmarkCards[playerId] ?? 0,
            },
          ],
        })),
      } as const;
      const tx = edit(state);
      tx.patchPublicState({ outcome });
      tx.setActivePlayers([]);
      return endGame(tx.state, outcome, {
        instructions: [fx.transition("gameOver")],
      });
    }

    const tx = edit(state);
    tx.advanceActivePlayer();
    return accept(tx.state, { instructions: [fx.transition("playerTurn")] });
  },
});
