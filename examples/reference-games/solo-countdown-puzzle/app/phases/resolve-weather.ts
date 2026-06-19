import type { GameContract } from "../game-contract";
import { resolveWeatherPhaseStateSchema } from "../game-contract";
import { beaconScore, makeOutcome, nextWeather, STORM_LIMIT } from "../rules";
import { definePhase } from "@dreamboard-games/sdk/reducer";

export const resolveWeather = definePhase<GameContract>()({
  kind: "auto",
  state: resolveWeatherPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, endGame, fx }) {
    const { card, remainingDeck } = nextWeather(state.publicState.weatherDeck);
    const prevented =
      card.stormDelta > 0 && state.publicState.reinforcement > 0;
    const stormDelta = prevented ? 0 : card.stormDelta;
    const nextStorm = state.publicState.storm + stormDelta;
    const event = {
      kind: "systemAction" as const,
      procedureId: "resolve-weather" as const,
      title: "Resolve weather",
      summary: prevented
        ? `${card.kind} was prevented by reinforcement.`
        : `${card.kind} changed storm by ${stormDelta}.`,
    };
    const nextState = {
      ...state,
      publicState: {
        ...state.publicState,
        weatherDeck: remainingDeck,
        storm: nextStorm,
        reinforcement: prevented
          ? state.publicState.reinforcement - 1
          : state.publicState.reinforcement,
        events: [...state.publicState.events, event],
      },
    };

    if (nextStorm >= STORM_LIMIT) {
      const score = beaconScore(nextState.publicState.beacons);
      const outcome = makeOutcome("storm-six", score);
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
      instructions: [fx.transition("advanceCountdown")],
    });
  },
});
