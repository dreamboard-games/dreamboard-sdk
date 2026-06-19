/**
 * App-owned reducer helpers for Frontier Trails.
 *
 * This file deliberately does NOT expose resource helpers (`canAfford`,
 * `spendResources`, …). Those live in the SDK:
 *
 *   - Queries: `q.player.canAfford(playerId, amounts)`,
 *              `q.player.resources(playerId)`, `q.player.resource(...)`,
 *              `q.player.missingResources(...)`
 *   - Writers: `tx.spendResources(...)`, `tx.addResources(...)`,
 *              `tx.transferResources(...)`, `tx.setResource(...)`
 *
 * Authoring a reducer should *never* need to mutate `table.resources`
 * directly or spread it by hand.
 */

import {
  createReducerEdit,
  type TableQueriesOfState,
} from "@dreamboard-games/sdk/reducer";
import type {
  CountsById,
  EdgeBuilding,
  GameState,
  PortType,
  PublicState,
  Terrain,
  VertexBuilding,
} from "./game-contract";
import {
  idGuards,
  ids,
  literals,
  type EdgeId,
  type PieceId,
  type PieceStateById,
  type PlayerId,
  type ResourceId,
  type SpaceId,
  type VertexId,
} from "../shared/manifest-contract";

/** A map of resource ids → counts. Used for build/trade costs. */
export type ResourceDelta = CountsById;

/**
 * Handy type aliases for authors of this game. The framework injects `q`
 * into every reducer callback, so author-written read helpers should accept
 * it as an argument instead of re-constructing it from `state`.
 */
export type Q = TableQueriesOfState<GameState>;
export const edit = createReducerEdit<GameState>();

const SECTOR = "frontier" as const;
type FrontierTrailsPieceType = "trail" | "camp" | "town" | "storm";
type FrontierOccupancy = {
  readonly coloniesByVertexId: Partial<Record<VertexId, VertexBuilding>>;
  readonly trailsByEdgeId: Partial<Record<EdgeId, EdgeBuilding>>;
  readonly campPiecesByVertexAndOwner: Partial<
    Record<VertexId, Partial<Record<PlayerId, PieceId>>>
  >;
  readonly detachedPiecesByOwnerAndType: Partial<
    Record<
      PlayerId,
      Partial<Record<Exclude<FrontierTrailsPieceType, "storm">, PieceId[]>>
    >
  >;
  readonly stormSpaceId: SpaceId | null;
};

const occupancyByLocations = new WeakMap<
  GameState["table"]["componentLocations"],
  FrontierOccupancy
>();

function ownerIdOf(piece: PieceStateById[PieceId]): PlayerId | null {
  const parsed = ids.playerId.nullable().optional().safeParse(piece.ownerId);
  return parsed.success ? (parsed.data ?? null) : null;
}

function frontierOccupancy(state: GameState): FrontierOccupancy {
  const locations = state.table.componentLocations;
  const cached = occupancyByLocations.get(locations);
  if (cached) return cached;

  const coloniesByVertexId: Partial<Record<VertexId, VertexBuilding>> = {};
  const trailsByEdgeId: Partial<Record<EdgeId, EdgeBuilding>> = {};
  const campPiecesByVertexAndOwner: Partial<
    Record<VertexId, Partial<Record<PlayerId, PieceId>>>
  > = {};
  const detachedPiecesByOwnerAndType: Partial<
    Record<
      PlayerId,
      Partial<Record<Exclude<FrontierTrailsPieceType, "storm">, PieceId[]>>
    >
  > = {};
  let stormSpace: SpaceId | null = null;

  for (const pieceId of literals.pieceIds) {
    const piece = state.table.pieces[pieceId];
    const location = locations[pieceId];
    if (!piece || !location) continue;
    const pieceTypeId = piece.pieceTypeId;

    if (
      location.type === "Detached" &&
      (pieceTypeId === "trail" ||
        pieceTypeId === "camp" ||
        pieceTypeId === "town")
    ) {
      const ownerId = ownerIdOf(piece);
      if (!ownerId) continue;
      const byType = (detachedPiecesByOwnerAndType[ownerId] ??= {});
      (byType[pieceTypeId] ??= []).push(pieceId);
      continue;
    }

    if (
      location.type === "OnVertex" &&
      location.boardId === SECTOR &&
      idGuards.isVertexId(location.vertexId) &&
      (pieceTypeId === "camp" || pieceTypeId === "town")
    ) {
      const ownerId = ownerIdOf(piece);
      if (!ownerId) continue;
      coloniesByVertexId[location.vertexId] = {
        ownerId,
        kind: pieceTypeId,
      };
      if (pieceTypeId === "camp") {
        campPiecesByVertexAndOwner[location.vertexId] = {
          ...(campPiecesByVertexAndOwner[location.vertexId] ?? {}),
          [ownerId]: pieceId,
        };
      }
      continue;
    }

    if (
      location.type === "OnEdge" &&
      location.boardId === SECTOR &&
      idGuards.isEdgeId(location.edgeId) &&
      pieceTypeId === "trail"
    ) {
      const ownerId = ownerIdOf(piece);
      if (!ownerId) continue;
      trailsByEdgeId[location.edgeId] = { ownerId };
      continue;
    }

    if (
      location.type === "OnSpace" &&
      location.boardId === SECTOR &&
      idGuards.isSpaceId(location.spaceId) &&
      piece.pieceTypeId === "storm"
    ) {
      stormSpace = location.spaceId;
    }
  }

  const occupancy = {
    coloniesByVertexId,
    trailsByEdgeId,
    campPiecesByVertexAndOwner,
    detachedPiecesByOwnerAndType,
    stormSpaceId: stormSpace,
  };
  occupancyByLocations.set(locations, occupancy);
  return occupancy;
}

export function findDetachedPieces(
  state: GameState,
  playerId: PlayerId,
  pieceTypeId: Exclude<FrontierTrailsPieceType, "storm">,
  count: number,
): PieceId[] {
  const found =
    frontierOccupancy(state).detachedPiecesByOwnerAndType[playerId]?.[
      pieceTypeId
    ] ?? [];
  if (found.length >= count) {
    return found.slice(0, count);
  }
  throw new Error(
    `No detached ${pieceTypeId} piece available for player '${playerId}'.`,
  );
}

export function buildingAt(
  state: GameState,
  _q: Q,
  vertexId: VertexId,
): VertexBuilding | null {
  return frontierOccupancy(state).coloniesByVertexId[vertexId] ?? null;
}

export function trailAt(
  state: GameState,
  _q: Q,
  edgeId: EdgeId,
): EdgeBuilding | null {
  return frontierOccupancy(state).trailsByEdgeId[edgeId] ?? null;
}

export function campPieceAt(
  state: GameState,
  _q: Q,
  vertexId: VertexId,
  playerId: PlayerId,
): PieceId | null {
  return (
    frontierOccupancy(state).campPiecesByVertexAndOwner[vertexId]?.[playerId] ??
    null
  );
}

export function coloniesByVertexId(
  state: GameState,
  _q: Q,
): Record<string, VertexBuilding> {
  return { ...frontierOccupancy(state).coloniesByVertexId };
}

export function trailsByEdgeId(
  state: GameState,
  _q: Q,
): Record<string, EdgeBuilding> {
  return { ...frontierOccupancy(state).trailsByEdgeId };
}

export function stormSpaceId(state: GameState): SpaceId {
  const spaceId = frontierOccupancy(state).stormSpaceId;
  if (!spaceId) {
    throw new Error("Storm piece is not on a board space.");
  }
  return spaceId;
}

/**
 * Keys of `PublicState` whose value is a per-player integer counter
 * (`Record<PlayerId, number>`). Used by `incrementPlayerScalar` to narrow
 * the allowed field argument and defend against accidental typos.
 */
type PerPlayerScalarKey = {
  [K in keyof PublicState]: PublicState[K] extends Partial<
    Record<PlayerId, number>
  >
    ? K
    : never;
}[keyof PublicState];

/**
 * Bump a per-player integer counter on `publicState` by `amount` (default
 * `1`). Returns a functional patch suitable for
 * `tx.patchPublicState(...)`. Prefer this over hand-spreading the map so
 * call sites stay a single line and counter names are type-checked.
 *
 * Example:
 *   tx.patchPublicState(incrementPlayerScalar("scoutsDeployed", playerId))
 */
export function incrementPlayerScalar(
  field: PerPlayerScalarKey,
  playerId: PlayerId,
  amount = 1,
): (pub: PublicState) => PublicState {
  return (pub) => {
    const current = pub[field] as Partial<Record<PlayerId, number>>;
    return {
      ...pub,
      [field]: {
        ...current,
        [playerId]: (current[playerId] ?? 0) + amount,
      },
    };
  };
}

export const TERRAIN_RESOURCE: Readonly<Record<Terrain, ResourceId | null>> = {
  timberGrove: "timber",
  clayPit: "clay",
  grainField: "grain",
  flaxMeadow: "cloth",
  ironHills: "iron",
  badlands: null,
  borderland: null,
};

export const RENOWN_TARGET = 10;
export const EXPLORER_GUILD_MIN = 3;
export const TRADE_NETWORK_MIN = 5;

export const COST_ROUTE: ResourceDelta = { timber: 1, clay: 1 };
export const COST_OUTPOST: ResourceDelta = {
  timber: 1,
  clay: 1,
  grain: 1,
  cloth: 1,
};
export const COST_HUB: ResourceDelta = { grain: 2, iron: 3 };
export const COST_CHARTER_CARD: ResourceDelta = { grain: 1, cloth: 1, iron: 1 };

/**
 * Compute the best bank trade rate for a player and resource.
 *
 * Intersects the player's buildings against the pre-derived port-vertex map
 * (see `portsByVertex` in `app/derived.ts`). Camps/towns on either
 * endpoint of a relay edge grant the port's rate (2:1 for a matching-resource
 * port, 3:1 for a generic "3:1" port); otherwise the default is 4:1.
 */
export function getBestTradeRate(
  coloniesByVertexId: Record<string, { ownerId: PlayerId } | undefined>,
  portsByVertexId: Readonly<Record<string, PortType>>,
  playerId: PlayerId,
  resource: string,
): number {
  let best = 4;
  for (const [vertexId, building] of Object.entries(coloniesByVertexId)) {
    if (!building || building.ownerId !== playerId) continue;
    const portType = portsByVertexId[vertexId];
    if (!portType) continue;
    if (portType === resource) best = Math.min(best, 2);
    else if (portType === "3:1") best = Math.min(best, 3);
  }
  return best;
}

/**
 * Count building Renown for one player. Used as an input for the
 * `publicInfluenceByPlayer` derived value in `app/derived.ts`.
 *
 * For Renown totals (colonies + trade network + explorer guild + charter cards),
 * use the `publicInfluenceByPlayer` / `winnerOf` derivations in `app/derived.ts`
 * via the `derived` resolver.
 */
export function computeColonyInfluence(
  coloniesByVertexId: Record<
    string,
    { ownerId: PlayerId; kind: string } | undefined
  >,
  playerId: PlayerId,
): number {
  let influence = 0;
  for (const building of Object.values(coloniesByVertexId)) {
    if (!building) continue;
    if (building.ownerId === playerId) {
      influence += building.kind === "town" ? 2 : 1;
    }
  }
  return influence;
}

/**
 * Compute longest continuous trail for a player via DFS over the edge
 * graph. The graph-theoretic part is game-specific and has no SDK
 * equivalent, so it lives here rather than in a `q.*` query.
 */
export function computeTradeNetwork(
  playerEdges: Set<string>,
  edgeToVertices: Record<string, [string, string]>,
  vertexToEdges: Record<string, string[]>,
  coloniesByVertex: Record<string, { ownerId: PlayerId } | undefined>,
  ownerId: PlayerId,
): number {
  if (playerEdges.size === 0) return 0;

  let maxLength = 0;

  function dfs(
    currentVertex: string,
    usedEdges: Set<string>,
    length: number,
  ): void {
    maxLength = Math.max(maxLength, length);
    const edges = vertexToEdges[currentVertex] ?? [];
    for (const edge of edges) {
      if (!playerEdges.has(edge) || usedEdges.has(edge)) continue;
      const endpoints = edgeToVertices[edge];
      if (!endpoints) continue;
      const [v1, v2] = endpoints;
      if (!v1 || !v2) continue;
      const nextVertex = v1 === currentVertex ? v2 : v1;
      const building = coloniesByVertex[nextVertex];
      if (building && building.ownerId !== ownerId) continue;
      usedEdges.add(edge);
      dfs(nextVertex, usedEdges, length + 1);
      usedEdges.delete(edge);
    }
  }

  for (const edge of playerEdges) {
    const endpoints = edgeToVertices[edge];
    if (!endpoints) continue;
    const [v1, v2] = endpoints;
    if (v1) dfs(v1, new Set([edge]), 1);
    if (v2) dfs(v2, new Set([edge]), 1);
  }

  return maxLength;
}
