import { definePlayerView } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "./game-contract";
import { activePlayerId, legalSurveyTargets, surveyCells } from "./model";

export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId }) {
    const publicState = state.publicState;
    return {
      currentPhase: state.flow.currentPhase,
      playerId,
      playerIds: publicState.playerIds,
      activePlayerId: activePlayerId(publicState),
      isActivePlayer: activePlayerId(publicState) === playerId,
      round: publicState.round,
      roll: publicState.roll,
      cells: surveyCells,
      myMarks: publicState.marks[playerId] ?? {},
      legalSpaceIds: legalSurveyTargets(publicState, playerId),
      completed: publicState.completed,
      scores: publicState.scores,
      outcome: publicState.outcome,
    };
  },
});
