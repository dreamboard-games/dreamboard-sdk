import { boardTarget } from "@dreamboard-games/sdk/reducer";
import type {
  EdgeId,
  SpaceId,
  VertexId,
} from "../shared/manifest-contract";
import type { GameState } from "./game-contract";
import { edgeTouchesIntersection } from "./model";
import {
  banditsHexId,
  campsByIntersectionId,
  isCampConnected,
  isTrailConnected,
  trailsByEdgeId,
} from "./reducer-support";

export const startingCampTarget = boardTarget
  .vertex<GameState, VertexId>("frontier")
  .where({
    id: "empty-intersection",
    errorCode: "SETUP_CAMP_OCCUPIED",
    message: "That intersection already has a camp.",
    test: ({ state, targetId }) =>
      campsByIntersectionId(state)[targetId] === undefined,
  })
  .build();

export const startingTrailTarget = boardTarget
  .edge<GameState, EdgeId>("frontier")
  .where({
    id: "empty-edge",
    errorCode: "EDGE_OCCUPIED",
    message: "That edge already has a trail.",
    test: ({ state, targetId }) =>
      trailsByEdgeId(state)[targetId] === undefined,
  })
  .where({
    id: "touches-starting-camp",
    errorCode: "SETUP_TRAIL_NOT_ADJACENT",
    message: "The starting trail must touch the camp just placed.",
    test: ({ state, targetId }) => {
      const intersectionId = state.publicState.setup?.pendingIntersectionId;
      return intersectionId
        ? edgeTouchesIntersection(targetId, intersectionId)
        : false;
    },
  })
  .build();

export const buildTrailTarget = boardTarget
  .edge<GameState, EdgeId>("frontier")
  .where({
    id: "empty-edge",
    errorCode: "EDGE_OCCUPIED",
    message: "That edge already has a trail.",
    test: ({ state, targetId }) =>
      trailsByEdgeId(state)[targetId] === undefined,
  })
  .where({
    id: "connected-network",
    errorCode: "TRAIL_NOT_CONNECTED",
    message: "Connect the new trail to your existing network.",
    test: ({ state, playerId, targetId }) =>
      isTrailConnected(state, playerId, targetId),
  })
  .build();

export const buildCampTarget = boardTarget
  .vertex<GameState, VertexId>("frontier")
  .where({
    id: "empty-intersection",
    errorCode: "VERTEX_OCCUPIED",
    message: "That intersection already has a camp.",
    test: ({ state, targetId }) =>
      campsByIntersectionId(state)[targetId] === undefined,
  })
  .where({
    id: "connected-trail",
    errorCode: "CAMP_NOT_CONNECTED",
    message: "Build the camp beside one of your trails.",
    test: ({ state, playerId, targetId }) =>
      isCampConnected(state, playerId, targetId),
  })
  .build();

export const banditsDestinationTarget = boardTarget
  .space<GameState, SpaceId>("frontier")
  .where({
    id: "different-hex",
    errorCode: "BANDITS_DESTINATION_REQUIRED",
    message: "Move the Bandits to a different district.",
    test: ({ state, targetId }) => banditsHexId(state) !== targetId,
  })
  .build();
