export { ensureArray } from "./internal";
export { cloneRuntimeTable } from "./clone";
export {
  getAdjacentSpaces,
  getBoard,
  getBoardsByTypeId,
  getComponentsOnEdge,
  getComponentsOnSpace,
  getComponentsOnVertex,
  getEdge,
  getEdgesByTypeId,
  getHexBoard,
  getHexSpace,
  getHexSpaceAt,
  getIncidentEdges,
  getIncidentVertices,
  getRelatedSpaces,
  getSpace,
  getSpaceDistance,
  getSpaceEdges,
  getSpacesByTypeId,
  getSpaceVertices,
  getSquareBoard,
  getSquareDistance,
  getSquareNeighbors,
  getSquareSpace,
  getSquareSpaceAt,
  getTiledBoard,
  getVertex,
  getVerticesByTypeId,
} from "./board-queries";
export {
  getComponentEdgeLocation,
  getComponentLocation,
  getComponentSpaceLocation,
  getComponentVertexLocation,
  getComponentZoneLocation,
} from "./component-locations";
export {
  getCard,
  getCardOwner,
  getCardsById,
  getCardVisibility,
} from "./zone-queries";
export {
  addPlayerResourcesInPlace,
  canAffordResources,
  getMissingResources,
  getNextPlayerInOrder,
  getPlayerOrder,
  getPlayerResourceAmount,
  getPlayerResources,
  getPlayerResourceTotal,
  setPlayerResourceInPlace,
  spendPlayerResourcesInPlace,
  transferPlayerResourcesInPlace,
} from "./resource-ops";
export {
  moveComponentToDetachedInPlace,
  moveComponentToEdgeInPlace,
  moveComponentToSpaceInPlace,
  moveComponentToVertexInPlace,
} from "./component-mutations";
export {
  moveComponentToZoneInPlace,
  dealComponentsInPlace,
  rotateZoneInPlace,
  flipCardInPlace,
} from "./card-mutations";
export {
  getZoneComponents,
  getZoneCardCollection,
  getZones,
} from "./zone-queries";

export type { RuntimeTableRecord, TableOfState, CardIdOfState } from "../model";
