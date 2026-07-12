import {
  createReducerEdit,
  type GameEvent,
  type GameOutcome,
  type TableQueriesOfState,
} from "@dreamboard-games/sdk/reducer";
import {
  ids,
  literals,
  type EdgeId,
  type PieceId,
  type PlayerId,
  type ResourceId,
  type SpaceId,
  type VertexId,
} from "../shared/manifest-contract";
import type {
  GameState,
  HistoryEntry,
  PrivateState,
  ResourceCounts,
} from "./game-contract";
import {
  BOARD_ID,
  EDGES_BY_INTERSECTION_ID,
  EDGE_INTERSECTION_IDS,
  INTERSECTIONS_BY_HEX_ID,
} from "./model";

export type Q = TableQueriesOfState<GameState>;
export const edit = createReducerEdit<GameState>();

export const TRAIL_COST: ResourceCounts = { timber: 1, brick: 1 };
export const CAMP_COST: ResourceCounts = {
  timber: 1,
  brick: 1,
  provisions: 1,
};

export function turnOwnerPlayerId(state: GameState, q: Q): PlayerId {
  const playerId = q.player.order()[state.publicState.activePlayerIndex];
  if (!playerId) throw new Error("Stormtrail requires exactly three players.");
  return playerId;
}

export function setupPlayerId(state: GameState, q: Q): PlayerId {
  const playerIndex = state.publicState.setup?.playerIndex;
  const playerId =
    playerIndex === undefined ? undefined : q.player.order()[playerIndex];
  if (!playerId) throw new Error("Stormtrail setup player is unavailable.");
  return playerId;
}

export function resourceTotalFromState(
  state: GameState,
  playerId: PlayerId,
): number {
  const resources = state.table.resources.entries.find(
    ([candidate]) => candidate === playerId,
  )?.[1];
  return Object.values(resources ?? {}).reduce(
    (total, count) => total + (typeof count === "number" ? count : 0),
    0,
  );
}

type Occupancy = {
  readonly campsByIntersectionId: Partial<Record<VertexId, PlayerId>>;
  readonly trailsByEdgeId: Partial<Record<EdgeId, PlayerId>>;
  readonly detachedByPlayerAndType: Partial<
    Record<PlayerId, { camp: PieceId[]; trail: PieceId[] }>
  >;
  readonly banditsHexId: SpaceId | null;
};

const occupancyCache = new WeakMap<
  GameState["table"]["componentLocations"],
  Occupancy
>();

function ownerIdOf(pieceId: PieceId, state: GameState): PlayerId | null {
  const result = ids.playerId.safeParse(state.table.pieces[pieceId]?.ownerId);
  return result.success ? result.data : null;
}

function occupancy(state: GameState): Occupancy {
  const locations = state.table.componentLocations;
  const cached = occupancyCache.get(locations);
  if (cached) return cached;

  const campsByIntersectionId: Partial<Record<VertexId, PlayerId>> = {};
  const trailsByEdgeId: Partial<Record<EdgeId, PlayerId>> = {};
  const detachedByPlayerAndType: Occupancy["detachedByPlayerAndType"] = {};
  let banditsHexId: SpaceId | null = null;

  for (const pieceId of literals.pieceIds) {
    const piece = state.table.pieces[pieceId];
    const location = locations[pieceId];
    if (!piece || !location) continue;
    const ownerId = ownerIdOf(pieceId, state);
    if (
      location.type === "Detached" &&
      ownerId &&
      (piece.pieceTypeId === "camp" || piece.pieceTypeId === "trail")
    ) {
      const byType = (detachedByPlayerAndType[ownerId] ??= {
        camp: [],
        trail: [],
      });
      byType[piece.pieceTypeId].push(pieceId);
    } else if (
      location.type === "OnVertex" &&
      location.boardId === BOARD_ID &&
      ownerId &&
      ids.vertexId.safeParse(location.vertexId).success &&
      piece.pieceTypeId === "camp"
    ) {
      campsByIntersectionId[location.vertexId as VertexId] = ownerId;
    } else if (
      location.type === "OnEdge" &&
      location.boardId === BOARD_ID &&
      ownerId &&
      ids.edgeId.safeParse(location.edgeId).success &&
      piece.pieceTypeId === "trail"
    ) {
      trailsByEdgeId[location.edgeId as EdgeId] = ownerId;
    } else if (
      location.type === "OnSpace" &&
      location.boardId === BOARD_ID &&
      ids.spaceId.safeParse(location.spaceId).success &&
      piece.pieceTypeId === "bandits"
    ) {
      banditsHexId = location.spaceId as SpaceId;
    }
  }

  const resolved = {
    campsByIntersectionId,
    trailsByEdgeId,
    detachedByPlayerAndType,
    banditsHexId,
  };
  occupancyCache.set(locations, resolved);
  return resolved;
}

export function campsByIntersectionId(
  state: GameState,
): Readonly<Partial<Record<VertexId, PlayerId>>> {
  return occupancy(state).campsByIntersectionId;
}

export function trailsByEdgeId(
  state: GameState,
): Readonly<Partial<Record<EdgeId, PlayerId>>> {
  return occupancy(state).trailsByEdgeId;
}

export function banditsHexId(state: GameState): SpaceId {
  const hexId = occupancy(state).banditsHexId;
  if (!hexId) throw new Error("Bandits are not on the Stormtrail map.");
  return hexId;
}

export function detachedPiece(
  state: GameState,
  playerId: PlayerId,
  pieceTypeId: "camp" | "trail",
): PieceId | null {
  return (
    occupancy(state).detachedByPlayerAndType[playerId]?.[pieceTypeId][0] ?? null
  );
}

export function remainingPieceCount(
  state: GameState,
  playerId: PlayerId,
  pieceTypeId: "camp" | "trail",
): number {
  return (
    occupancy(state).detachedByPlayerAndType[playerId]?.[pieceTypeId].length ??
    0
  );
}

export function campCount(state: GameState, playerId: PlayerId): number {
  return Object.values(occupancy(state).campsByIntersectionId).filter(
    (ownerId) => ownerId === playerId,
  ).length;
}

export function isTrailConnected(
  state: GameState,
  playerId: PlayerId,
  edgeId: EdgeId,
): boolean {
  const camps = occupancy(state).campsByIntersectionId;
  const trails = occupancy(state).trailsByEdgeId;
  return EDGE_INTERSECTION_IDS[edgeId].some((intersectionId) => {
    const campOwnerId = camps[intersectionId];
    if (campOwnerId === playerId) return true;
    if (campOwnerId && campOwnerId !== playerId) return false;
    return EDGES_BY_INTERSECTION_ID[intersectionId].some(
      (candidateEdgeId) =>
        candidateEdgeId !== edgeId && trails[candidateEdgeId] === playerId,
    );
  });
}

export function isCampConnected(
  state: GameState,
  playerId: PlayerId,
  intersectionId: VertexId,
): boolean {
  const trails = occupancy(state).trailsByEdgeId;
  return EDGES_BY_INTERSECTION_ID[intersectionId].some(
    (edgeId) => trails[edgeId] === playerId,
  );
}

export function eligibleBanditVictims(
  state: GameState,
  q: Q,
  actorPlayerId: PlayerId,
  hexId: SpaceId,
): PlayerId[] {
  const camps = occupancy(state).campsByIntersectionId;
  const victims = new Set<PlayerId>();
  for (const intersectionId of INTERSECTIONS_BY_HEX_ID[hexId]) {
    const ownerId = camps[intersectionId];
    if (
      ownerId &&
      ownerId !== actorPlayerId &&
      q.player.resourceTotal(ownerId) > 0
    ) {
      victims.add(ownerId);
    }
  }
  return q.player.order().filter((playerId) => victims.has(playerId));
}

export function resourceCards(
  resources: Readonly<Record<ResourceId, number>>,
): ResourceId[] {
  return literals.resourceIds.flatMap((resourceId) =>
    Array.from({ length: resources[resourceId] ?? 0 }, () => resourceId),
  );
}

export function patchPrivateState(
  state: GameState,
  playerId: PlayerId,
  patch: Partial<PrivateState>,
): GameState {
  return {
    ...state,
    privateState: {
      ...state.privateState,
      [playerId]: { ...state.privateState[playerId], ...patch },
    },
  };
}

export function clearStealSecrets(state: GameState): GameState {
  return state.table.playerOrder.reduce(
    (next, playerId) =>
      patchPrivateState(next, playerId, { lastStolenResourceId: null }),
    state,
  );
}

export function appendHistory(
  state: GameState,
  entry: Omit<HistoryEntry, "turn">,
): GameState {
  return {
    ...state,
    publicState: {
      ...state.publicState,
      history: [
        ...state.publicState.history,
        { ...entry, turn: state.publicState.turnNumber },
      ],
    },
  };
}

export function systemEvent(options: {
  procedureId: string;
  title: string;
  summary: string;
  details?: GameEvent["details"];
}): GameEvent {
  return { kind: "systemAction", ...options };
}

export function fourthCampOutcome(
  playerIds: readonly PlayerId[],
  winnerPlayerId: PlayerId,
): GameOutcome<PlayerId> {
  return {
    reason: {
      code: "FOURTH_CAMP_BUILT",
      message: `${winnerPlayerId} established the fourth camp.`,
    },
    standings: playerIds.map((playerId) => ({
      playerId,
      rank: playerId === winnerPlayerId ? 1 : 2,
      result: playerId === winnerPlayerId ? "win" : "loss",
    })),
  };
}
