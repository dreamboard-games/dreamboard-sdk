import type { PlayerId } from "../../shared/manifest-contract";
import type { GameContract, ProcedureEvent } from "../game-contract";
import { advanceRiverRoundPhaseStateSchema } from "../game-contract";
import { procedureGameEvent } from "../rules/events";
import { cooperativeOutcome } from "../rules/outcome";
import { definePhase } from "@dreamboard-games/sdk/reducer";

export const advanceRiverRound = definePhase<GameContract>()({
  kind: "auto",
  state: advanceRiverRoundPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, edit, endGame, fx, q }) {
    const completedRound = state.publicState.round;
    const nextRound = completedRound >= 6 ? null : completedRound + 1;
    const roundEvent: ProcedureEvent = {
      kind: "river-round-advanced",
      completedRound,
      nextRound,
    };
    const tx = edit(state);
    tx.patchPublicState({
      ...(nextRound === null ? {} : { round: nextRound }),
      activeHumanIndex: 0,
      procedureEvents: [...state.publicState.procedureEvents, roundEvent],
    });

    if (nextRound === null) {
      const playerIds = q.player.order() as readonly PlayerId[];
      const outcome = cooperativeOutcome(
        tx.q,
        playerIds,
        state.publicState.rivalProgress,
      );
      tx.patchPublicState({ outcome });
      tx.setActivePlayers([]);
      return endGame(tx.state, outcome, {
        events: [procedureGameEvent(roundEvent)],
        instructions: [fx.transition("gameOver")],
      });
    }

    return accept(tx.state, {
      events: [procedureGameEvent(roundEvent)],
      instructions: [fx.transition("humanTurn")],
    });
  },
});
