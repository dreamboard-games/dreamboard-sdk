import { hearts } from "../game-model";
import { scoreCompletedHand } from "../rules";

const scoreHand = hearts.phase("scoreHand");

export default scoreHand.define({
  kind: "auto",
  initialState: () => ({}),
  enter({ state, tx }) {
    if (state.publicState.tricksCompleted !== 13) {
      throw new Error(
        "Hearts scoring requires exactly thirteen completed tricks.",
      );
    }
    const scored = scoreCompletedHand({
      playerIds: state.publicState.playerIds,
      capturedHeartsByPlayer: state.publicState.capturedHeartsByPlayer,
      queenOfSpadesCapturedBy: state.publicState.queenOfSpadesCapturedBy,
    });
    tx.patchPublicState({
      pointsByPlayer: scored.pointsByPlayer,
      moonShooter: scored.moonShooter,
      completed: true,
      outcome: scored.outcome,
    });
    tx.setActivePlayers([]);
    return tx.endGame(scored.outcome, { transition: "gameOver" });
  },
});
