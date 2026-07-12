import { definePhase } from "@dreamboard-games/sdk/reducer";
import {
  advanceCountdownPhaseStateSchema,
  type GameContract,
} from "../game-contract";
import { advanceCountdown as resolveCountdown, makeOutcome } from "../rules";

export const advanceCountdown = definePhase<GameContract>()({
  kind: "auto",
  state: advanceCountdownPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, edit, endGame, fx, q }) {
    const [playerId] = q.player.order();
    if (!playerId) {
      throw new Error("Last Light requires exactly one human player.");
    }
    const countdown = resolveCountdown(state.publicState);
    const tx = edit(state);
    tx.patchPublicState(countdown.publicState);
    tx.setActivePlayers([]);

    if (countdown.publicState.turnsRemaining === 0) {
      const outcome = makeOutcome("DAWN_ARRIVED", playerId);
      tx.patchPublicState({ completed: true, outcome });
      return endGame(tx.state, outcome, {
        instructions: [fx.transition("gameOver")],
        events: [countdown.event],
      });
    }

    return accept(tx.state, {
      instructions: [fx.transition("playerTurn")],
      events: [countdown.event],
    });
  },
});
