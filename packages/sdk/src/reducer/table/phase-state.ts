import type { PlayerIdOfState } from "../model";

export function setActivePlayers<
  State extends { flow: { activePlayers: PlayerIdOfState<State>[] } },
>(state: State, activePlayers: PlayerIdOfState<State>[]): State {
  return {
    ...state,
    flow: {
      ...state.flow,
      activePlayers,
    },
  };
}

export function setPhaseState<State extends { phase: object }, PhaseState>(
  state: State,
  phaseState: PhaseState,
): State {
  return {
    ...state,
    phase: phaseState,
  };
}
