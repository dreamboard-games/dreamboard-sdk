import { definePhase } from "@dreamboard-games/sdk/reducer";
import { scoreHandPhaseStateSchema, type GameContract } from "../game-contract";
import { scoreCompletedHand } from "../rules";

export const scoreHand = definePhase<GameContract>()({
  kind: "auto",
  state: scoreHandPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, edit, endGame, fx }) {
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
    const tx = edit(state);
    tx.patchPublicState({
      pointsByPlayer: scored.pointsByPlayer,
      moonShooter: scored.moonShooter,
      completed: true,
      outcome: scored.outcome,
    });
    tx.setActivePlayers([]);
    return endGame(tx.state, scored.outcome, {
      instructions: [fx.transition("gameOver")],
    });
  },
});
