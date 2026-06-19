import type { GameContract } from "../game-contract";
import { advanceCountdownPhaseStateSchema } from "../game-contract";
import { beaconScore, makeOutcome } from "../rules";
import { definePhase } from "@dreamboard-games/sdk/reducer";

export const advanceCountdown = definePhase<GameContract>()({
  kind: "auto",
  state: advanceCountdownPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, endGame, fx }) {
    const turnsRemaining = Math.max(0, state.publicState.turnsRemaining - 1);
    const event = {
      kind: "systemAction" as const,
      procedureId: "advance-countdown" as const,
      title: "Advance countdown",
      summary: `${turnsRemaining} turns remain.`,
    };
    const nextState = {
      ...state,
      publicState: {
        ...state.publicState,
        turnsRemaining,
        events: [...state.publicState.events, event],
      },
    };

    if (turnsRemaining <= 0) {
      const score = beaconScore(nextState.publicState.beacons);
      const outcome = makeOutcome("countdown-exhausted", score);
      return endGame(
        {
          ...nextState,
          publicState: {
            ...nextState.publicState,
            completed: true,
            outcome,
          },
        },
        outcome,
        { instructions: [fx.transition("gameOver")] },
      );
    }

    return accept(nextState, {
      instructions: [fx.transition("playerTurn")],
    });
  },
});
