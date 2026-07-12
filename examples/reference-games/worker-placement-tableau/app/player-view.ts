import {
  createStateQueries,
  definePlayerView,
  defineSharedView,
} from "@dreamboard-games/sdk/reducer";
import {
  literals,
  type PieceId,
  type PlayerId,
  type ResourceId,
  type SpaceId,
} from "../shared/manifest-contract";
import type { GameContract, GameState } from "./game-contract";
import {
  ACTION_SPACE_IDS,
  occupantsAt,
  scorePlayer,
  workerOwner,
} from "./reducer-support";

type Q = ReturnType<typeof createStateQueries<GameState>>;

function projectShared(state: GameState, q: Q) {
  const playerIds = q.player.order() as readonly PlayerId[];
  const resourcesByPlayer = Object.fromEntries(
    playerIds.map((playerId) => [playerId, q.player.resources(playerId)]),
  ) as Record<PlayerId, Record<ResourceId, number>>;
  const workersByPlayer = Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      literals.pieceIds
        .filter((workerId) => workerOwner(workerId) === playerId)
        .map((workerId) => ({
          id: workerId,
          kind: workerId.startsWith("master-")
            ? ("master" as const)
            : ("ordinary" as const),
          location: state.publicState.workerLocations[workerId],
        })),
    ]),
  ) as Record<
    PlayerId,
    Array<{
      id: PieceId;
      kind: "ordinary" | "master";
      location: SpaceId | null;
    }>
  >;
  return {
    currentPhase: state.flow.currentPhase,
    season: state.publicState.season,
    firstPlayerId: state.publicState.firstPlayerId,
    activePlayerId: state.publicState.activePlayerId,
    passedPlayerIds: state.publicState.passedPlayerIds,
    playerIds,
    resourcesByPlayer,
    workersByPlayer,
    occupantsBySpace: Object.fromEntries(
      ACTION_SPACE_IDS.map((spaceId) => [spaceId, occupantsAt(state, spaceId)]),
    ),
    tableauByPlayer: state.publicState.tableauByPlayer,
    runningScoreByPlayer: Object.fromEntries(
      playerIds.map((playerId) => [playerId, scorePlayer(state, playerId)]),
    ),
    events: state.publicState.events,
    finalScoreByPlayer: state.publicState.finalScoreByPlayer,
    outcome: state.publicState.outcome,
  };
}

export const sharedView = defineSharedView<GameContract>()({
  project({ state, q }) {
    return projectShared(state, q);
  },
});

export const playerView = definePlayerView<GameContract>()({
  project({ state, q, playerId }) {
    return {
      ...projectShared(state, q),
      playerId,
      isActive: state.publicState.activePlayerId === playerId,
    };
  },
});
