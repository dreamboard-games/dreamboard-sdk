import { definePhase } from "@dreamboard-games/sdk/reducer";
import {
  resolveWeatherPhaseStateSchema,
  type GameContract,
} from "../game-contract";
import { makeOutcome, resolveNextWeather, STORM_LIMIT } from "../rules";

export const resolveWeather = definePhase<GameContract>()({
  kind: "auto",
  state: resolveWeatherPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, edit, endGame, fx, q }) {
    const [playerId] = q.player.order();
    if (!playerId) {
      throw new Error("Last Light requires exactly one human player.");
    }
    const resolution = resolveNextWeather(state.publicState, state.hiddenState);
    const tx = edit(state);
    tx.patchPublicState(resolution.publicState);
    tx.patchHiddenState(resolution.hiddenState);
    tx.setActivePlayers([]);

    if (resolution.publicState.storm >= STORM_LIMIT) {
      const outcome = makeOutcome("STORM_REACHED_LIGHTHOUSE", playerId);
      tx.patchPublicState({ completed: true, outcome });
      return endGame(tx.state, outcome, {
        instructions: [fx.transition("gameOver")],
        events: [...resolution.events],
      });
    }

    return accept(tx.state, {
      instructions: [fx.transition("advanceCountdown")],
      events: [...resolution.events],
    });
  },
});
