import {
  definePlayerView,
  defineSharedView,
  type TableQueriesOfState,
} from "@dreamboard-games/sdk/reducer";
import { literals, type PlayerId } from "../shared/manifest-contract";
import type { GameContract, GameState } from "./game-contract";
import { HEX_RULES } from "./model";
import {
  banditsHexId,
  campsByIntersectionId,
  remainingPieceCount,
  trailsByEdgeId,
} from "./reducer-support";

function projectPublic(state: GameState, q: TableQueriesOfState<GameState>) {
  return {
    currentPhase: state.flow.currentPhase,
    activePlayerId: state.flow.activePlayers[0] ?? null,
    turnNumber: state.publicState.turnNumber,
    setup: state.publicState.setup,
    hexes: literals.spaceIds.map((hexId) => ({
      id: hexId,
      ...HEX_RULES[hexId],
    })),
    banditsHexId: banditsHexId(state),
    campsByIntersectionId: campsByIntersectionId(state),
    trailsByEdgeId: trailsByEdgeId(state),
    lastRoll: state.publicState.lastRoll,
    lastProduction: state.publicState.lastProduction,
    discardCountsByPlayerId: state.publicState.discardCountsByPlayerId,
    currentTrade: state.publicState.currentTrade,
    tradeHistory: state.publicState.tradeHistory,
    lastSteal: state.publicState.lastSteal,
    history: state.publicState.history,
    supplyCountByPlayerId: Object.fromEntries(
      q.player
        .order()
        .map((playerId) => [playerId, q.player.resourceTotal(playerId)]),
    ) as Record<PlayerId, number>,
    remainingCampsByPlayerId: Object.fromEntries(
      q.player
        .order()
        .map((playerId) => [
          playerId,
          remainingPieceCount(state, playerId, "camp"),
        ]),
    ) as Record<PlayerId, number>,
    remainingTrailsByPlayerId: Object.fromEntries(
      q.player
        .order()
        .map((playerId) => [
          playerId,
          remainingPieceCount(state, playerId, "trail"),
        ]),
    ) as Record<PlayerId, number>,
    outcome: state.publicState.outcome,
  };
}

export const sharedView = defineSharedView<GameContract>()({
  project({ state, q }) {
    return projectPublic(state, q);
  },
});

export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId, q }) {
    const privateState = state.privateState[playerId];
    const lastSteal = state.publicState.lastSteal;
    const participatedInLastSteal =
      lastSteal?.thiefPlayerId === playerId ||
      lastSteal?.victimPlayerId === playerId;
    return {
      ...projectPublic(state, q),
      playerId,
      mySupplies: q.player.resources(playerId),
      myDiscardRequired:
        state.flow.currentPhase === "discardBarrier" &&
        !(state.phase.completedPlayerIds ?? []).includes(playerId)
          ? (state.phase.requiredByPlayerId?.[playerId] ?? 0)
          : 0,
      myLastDiscard: privateState.lastDiscard,
      myLastStolenResourceId: participatedInLastSteal
        ? privateState.lastStolenResourceId
        : null,
    };
  },
});
