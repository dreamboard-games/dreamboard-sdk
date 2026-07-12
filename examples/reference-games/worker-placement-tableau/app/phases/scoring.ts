import { definePhase } from "@dreamboard-games/sdk/reducer";
import type { PlayerId } from "../../shared/manifest-contract";
import { scoringPhaseStateSchema, type GameContract } from "../game-contract";
import { finalOutcome } from "../reducer-support";

export const scoring = definePhase<GameContract>()({
  kind: "auto",
  state: scoringPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, edit, endGame, fx, q }) {
    const { outcome, scores } = finalOutcome(
      state,
      q.player.order() as readonly PlayerId[],
    );
    const tx = edit(state);
    tx.patchPublicState({
      activePlayerId: null,
      finalScoreByPlayer: scores,
      outcome,
    });
    tx.setActivePlayers([]);
    return endGame(tx.state, outcome, {
      instructions: [fx.transition("gameOver")],
    });
  },
});
