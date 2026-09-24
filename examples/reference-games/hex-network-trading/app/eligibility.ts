import type { BoundTargetPredicate } from "@dreamboard-games/sdk/reducer";
import type { EdgeId, SpaceId, VertexId } from "./manifest";
import { stormtrail } from "./game-model";
import { edgeTouchesIntersection } from "./model";
import {
  banditsHexId,
  campsByIntersectionId,
  isCampConnected,
  isTrailConnected,
  trailsByEdgeId,
} from "./reducer-support";

// Legal-target predicates. Each phase composes them into a board input with
// `inputs.board.<kind>({ boardId: "frontier", where: [...] })`. Error codes
// are checked against the model, and `state` is the full game state.

type Contract = typeof stormtrail.types.Contract;
type Predicate<Target> = BoundTargetPredicate<Contract, Target>;

export const emptyIntersection: Predicate<VertexId> = {
  id: "empty-intersection",
  errorCode: "SETUP_CAMP_OCCUPIED",
  message: "That intersection already has a camp.",
  test: ({ state, targetId }) =>
    campsByIntersectionId(state)[targetId] === undefined,
};

export const emptyBuildIntersection: Predicate<VertexId> = {
  ...emptyIntersection,
  errorCode: "VERTEX_OCCUPIED",
};

export const emptyEdge: Predicate<EdgeId> = {
  id: "empty-edge",
  errorCode: "EDGE_OCCUPIED",
  message: "That edge already has a trail.",
  test: ({ state, targetId }) => trailsByEdgeId(state)[targetId] === undefined,
};

export const touchesStartingCamp: Predicate<EdgeId> = {
  id: "touches-starting-camp",
  errorCode: "SETUP_TRAIL_NOT_ADJACENT",
  message: "The starting trail must touch the camp just placed.",
  test: ({ state, targetId }) => {
    const intersectionId = state.publicState.setup?.pendingIntersectionId;
    return intersectionId
      ? edgeTouchesIntersection(targetId, intersectionId)
      : false;
  },
};

export const connectedNetwork: Predicate<EdgeId> = {
  id: "connected-network",
  errorCode: "TRAIL_NOT_CONNECTED",
  message: "Connect the new trail to your existing network.",
  test: ({ state, q, playerId, targetId }) =>
    isTrailConnected(state, q, playerId, targetId),
};

export const connectedTrail: Predicate<VertexId> = {
  id: "connected-trail",
  errorCode: "CAMP_NOT_CONNECTED",
  message: "Build the camp beside one of your trails.",
  test: ({ state, q, playerId, targetId }) =>
    isCampConnected(state, q, playerId, targetId),
};

export const differentHex: Predicate<SpaceId> = {
  id: "different-hex",
  errorCode: "BANDITS_DESTINATION_REQUIRED",
  message: "Move the Bandits to a different district.",
  test: ({ state, targetId }) => banditsHexId(state) !== targetId,
};
