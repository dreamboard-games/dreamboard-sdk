/**
 * Centralised board-eligibility helpers for Frontier Trails interactions.
 *
 * Each interaction's bound board-input collector references one
 * of these helpers as its `eligibleTargets` callback. That keeps the rule
 * (e.g. "camp vertex must be land, unoccupied, and respect distance")
 * in one place instead of being duplicated between the reducer's
 * `validate()` and the UI's hover layer:
 *
 *   - `validate()` rejects submissions that don't pass the full rule and
 *     stays authoritative.
 *   - The helpers here project the same predicates into a list, which the
 *     host runtime ships on `descriptor.eligibleTargets` so the UI can
 *     paint idle / hover cues without rebuilding a board graph.
 *
 * Helpers take the same `(state, playerId, q)` trio as the input-collector
 * `eligibleTargets` hook so they can be wired in directly.
 */

import type { GameState, SetupPhaseState } from "./game-contract";
import { buildingAt, stormSpaceId, trailAt, type Q } from "./reducer-support";
import { boardTarget } from "@dreamboard-games/sdk/reducer";
import {
  boardHelpers,
  idGuards,
  staticBoards,
  type EdgeId,
  type PlayerId,
  type SpaceId,
  type VertexId,
} from "../shared/manifest-contract";

function setupPhase(state: GameState): SetupPhaseState | null {
  return state.phase.get("setup");
}

const SECTOR = "frontier" as const;
const SPACE_KINDS = boardHelpers.spaceKinds(SECTOR);
const FRONTIER_BOARD = staticBoards.byId[SECTOR];
const LAND_VERTEX_IDS = new Set(
  FRONTIER_BOARD.vertices
    .filter((vertex) => vertex.spaceIds.some(isLandSpaceId))
    .map((vertex) => vertex.id),
);
const LAND_EDGE_IDS = new Set(
  FRONTIER_BOARD.edges
    .filter((edge) => edge.spaceIds.some(isLandSpaceId))
    .map((edge) => edge.id),
);
const EDGE_VERTICES = FRONTIER_BOARD.edges.reduce<
  Partial<Record<EdgeId, readonly [VertexId, VertexId]>>
>((index, edge) => {
  const [left, right] = edge.id.replace("hex-edge:", "").split("::");
  if (!left || !right) {
    throw new Error(`Invalid Frontier Trails edge id '${edge.id}'.`);
  }
  index[edge.id] = [
    idGuards.expectVertexId(`hex-vertex:${left}`),
    idGuards.expectVertexId(`hex-vertex:${right}`),
  ] as const;
  return index;
}, {});
const VERTEX_EDGES = FRONTIER_BOARD.edges.reduce<
  Partial<Record<VertexId, EdgeId[]>>
>((index, edge) => {
  const vertices = EDGE_VERTICES[edge.id];
  if (!vertices) {
    throw new Error(`Missing Frontier Trails vertices for edge '${edge.id}'.`);
  }
  for (const vertexId of vertices) {
    (index[vertexId] ??= []).push(edge.id);
  }
  return index;
}, {});

function isLandSpaceId(spaceId: SpaceId): boolean {
  return SPACE_KINDS[spaceId] === "land";
}

function isLandVertex(_q: Q, vertexId: VertexId): boolean {
  return LAND_VERTEX_IDS.has(vertexId);
}

function isLandEdge(_q: Q, edgeId: EdgeId): boolean {
  return LAND_EDGE_IDS.has(edgeId);
}

/** Does `vertexId` satisfy Frontier Trails "no neighbours" distance rule? */
function distanceRuleOk(state: GameState, q: Q, vertexId: VertexId): boolean {
  for (const edgeId of VERTEX_EDGES[vertexId] ?? []) {
    const vertices = EDGE_VERTICES[edgeId];
    if (!vertices) continue;
    const [v1, v2] = vertices;
    const adj = v1 === vertexId ? v2 : v2 === vertexId ? v1 : null;
    if (adj && buildingAt(state, q, adj)) return false;
  }
  return true;
}

function isAdjacentToOwnTrail(
  state: GameState,
  q: Q,
  vertexId: VertexId,
  playerId: PlayerId,
): boolean {
  for (const edgeId of VERTEX_EDGES[vertexId] ?? []) {
    if (trailAt(state, q, edgeId)?.ownerId === playerId) {
      return true;
    }
  }
  return false;
}

function isAdjacentToOwnBuilding(
  state: GameState,
  q: Q,
  edgeId: EdgeId,
  playerId: PlayerId,
): boolean {
  for (const vertexId of EDGE_VERTICES[edgeId] ?? []) {
    if (buildingAt(state, q, vertexId)?.ownerId === playerId) {
      return true;
    }
  }
  return false;
}

/**
 * "Connected network" rule for playerTurn trail placement: an edge is
 * eligible if some endpoint vertex either (a) holds the player's own
 * building, or (b) is adjacent via a different edge that already carries
 * the player's trail *and* isn't blocked by an opponent's building on the
 * shared vertex (Frontier Trails classic break rule).
 */
function isConnectedTrailTarget(
  state: GameState,
  q: Q,
  edgeId: EdgeId,
  playerId: PlayerId,
): boolean {
  for (const vertexId of EDGE_VERTICES[edgeId] ?? []) {
    const building = buildingAt(state, q, vertexId);
    if (building?.ownerId === playerId) return true;
    if (building && building.ownerId !== playerId) continue;
    for (const otherEdgeId of VERTEX_EDGES[vertexId] ?? []) {
      if (otherEdgeId === edgeId) continue;
      if (trailAt(state, q, otherEdgeId)?.ownerId === playerId) {
        return true;
      }
    }
  }
  return false;
}

// ── Public helpers ──────────────────────────────────────────────────────────

export const setupCampTarget = boardTarget
  .vertex<GameState, VertexId>(SECTOR)
  .where({
    id: "setupStep",
    errorCode: "SETUP_SETTLEMENT_NOT_PENDING",
    message: "Place your setup camp first.",
    test: ({ state }) => {
      const phase = setupPhase(state);
      return !!phase && !phase.placedCamp;
    },
  })
  .where({
    id: "land",
    errorCode: "OCEAN_VERTEX",
    message: "Cannot place a camp in the borderlands.",
    test: ({ q, targetId }) => isLandVertex(q, targetId),
  })
  .where({
    id: "empty",
    errorCode: "VERTEX_OCCUPIED",
    message: "That vertex is already occupied.",
    test: ({ state, q, targetId }) => !buildingAt(state, q, targetId),
  })
  .where({
    id: "distance",
    errorCode: "DISTANCE_RULE",
    message: "Too close to another camp.",
    test: ({ state, q, targetId }) => distanceRuleOk(state, q, targetId),
  })
  .build();

export const setupTrailTarget = boardTarget
  .edge<GameState, EdgeId>(SECTOR)
  .where({
    id: "setupStep",
    errorCode: "SETUP_ROAD_NOT_PENDING",
    message: "Place your setup camp before the trail.",
    test: ({ state }) => {
      const phase = setupPhase(state);
      return !!phase && phase.placedCamp;
    },
  })
  .where({
    id: "touchesLand",
    errorCode: "OCEAN_EDGE",
    message: "Cannot build a trail in the borderlands.",
    test: ({ q, targetId }) => isLandEdge(q, targetId),
  })
  .where({
    id: "empty",
    errorCode: "EDGE_OCCUPIED",
    message: "That edge already has a trail.",
    test: ({ state, q, targetId }) => !trailAt(state, q, targetId),
  })
  .where({
    id: "adjacentCamp",
    errorCode: "NOT_CONNECTED",
    message: "Trail must connect to your camp.",
    test: ({ state, q, targetId, playerId }) =>
      isAdjacentToOwnBuilding(state, q, targetId, playerId),
  })
  .build();

export const buildCampTarget = boardTarget
  .vertex<GameState, VertexId>(SECTOR)
  .where({
    id: "land",
    errorCode: "OCEAN_VERTEX",
    message: "Cannot place a camp in the borderlands.",
    test: ({ q, targetId }) => isLandVertex(q, targetId),
  })
  .where({
    id: "empty",
    errorCode: "VERTEX_OCCUPIED",
    message: "That vertex is occupied.",
    test: ({ state, q, targetId }) => !buildingAt(state, q, targetId),
  })
  .where({
    id: "distance",
    errorCode: "DISTANCE_RULE",
    message: "Too close to another camp.",
    test: ({ state, q, targetId }) => distanceRuleOk(state, q, targetId),
  })
  .where({
    id: "adjacentTrail",
    errorCode: "NOT_CONNECTED_TO_ROAD",
    message: "Must be adjacent to your trail.",
    test: ({ state, q, targetId, playerId }) =>
      isAdjacentToOwnTrail(state, q, targetId, playerId),
  })
  .build();

export const upgradeToTownTarget = boardTarget
  .vertex<GameState, VertexId>(SECTOR)
  .where({
    id: "ownCamp",
    errorCode: "NO_SETTLEMENT",
    message: "No camp to upgrade.",
    test: ({ state, q, targetId, playerId }) => {
      const building = buildingAt(state, q, targetId);
      return building?.ownerId === playerId && building.kind === "camp";
    },
  })
  .build();

export const buildTrailTarget = boardTarget
  .edge<GameState, EdgeId>(SECTOR)
  .where({
    id: "touchesLand",
    errorCode: "OCEAN_EDGE",
    message: "Cannot build a trail in the borderlands.",
    test: ({ q, targetId }) => isLandEdge(q, targetId),
  })
  .where({
    id: "empty",
    errorCode: "EDGE_OCCUPIED",
    message: "That edge already has a trail.",
    test: ({ state, q, targetId }) => !trailAt(state, q, targetId),
  })
  .where({
    id: "connected",
    errorCode: "NOT_CONNECTED",
    message: "Trail must connect to your network.",
    test: ({ state, q, targetId, playerId }) =>
      isConnectedTrailTarget(state, q, targetId, playerId),
  })
  .build();

export const stormSpaceTarget = boardTarget
  .space<GameState, SpaceId>(SECTOR)
  .where({
    id: "land",
    errorCode: "OCEAN_SPACE",
    message: "Move the storm to a land hex.",
    test: ({ targetId }) => isLandSpaceId(targetId),
  })
  .where({
    id: "different",
    errorCode: "SAME_SPACE",
    message: "Must move storm to a different hex.",
    test: ({ state, targetId }) => targetId !== stormSpaceId(state),
  })
  .build();
