import {
  definePlayerView,
  defineSharedView,
} from "@dreamboard-games/sdk/reducer";
import type { GameContract, GameState } from "./game-contract";
import { activePlayerId, legalSurveyTargets, surveyCells } from "./model";

function projectSharedState(state: Pick<GameState, "flow" | "publicState">) {
  const publicState = state.publicState;
  return {
    currentPhase: state.flow.currentPhase,
    playerIds: publicState.playerIds,
    activePlayerId: activePlayerId(publicState),
    round: publicState.round,
    roll: publicState.roll,
    cells: surveyCells,
    marksByPlayer: publicState.marks,
    completed: publicState.completed,
    scores: publicState.scores,
    outcome: publicState.outcome,
  };
}

export const sharedView = defineSharedView<GameContract>()({
  project({ state }) {
    return projectSharedState(state);
  },
});

export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId }) {
    return {
      ...projectSharedState(state),
      playerId,
      isActivePlayer: activePlayerId(state.publicState) === playerId,
      myMarks: state.publicState.marks[playerId] ?? {},
      legalSpaceIds: legalSurveyTargets(state.publicState, playerId),
    };
  },
});
