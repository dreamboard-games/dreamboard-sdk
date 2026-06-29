import { definePlayerView } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "./game-contract";

export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId }) {
    return {
      playerId,
      currentPhase: state.flow.currentPhase,
      round: state.publicState.round,
      river: state.publicState.river,
      rivalDeckCount: state.publicState.rivalDeck.length,
      rivalProgress: state.publicState.rivalProgress,
      teamScore: state.publicState.teamScore,
      eventLog: state.publicState.eventLog,
      outcome: state.publicState.outcome,
      processedClaimCount: Object.keys(state.publicState.processedClaims)
        .length,
    };
  },
});
