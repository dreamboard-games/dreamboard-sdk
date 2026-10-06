export { ensureArray } from "./internal";
export { cloneRuntimeTable } from "./clone";
export { assertCardAllowedInContainer } from "./card-validation";
export {
  getAdjacentSpaces,
  getBoard,
  getBoardsByTypeId,
  getComponentsInContainer,
  getComponentsOnEdge,
  getComponentsOnSpace,
  getComponentsOnVertex,
  getContainer,
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
  getComponentContainerLocation,
  getComponentEdgeLocation,
  getComponentLocation,
  getComponentSlotLocation,
  getComponentSpaceLocation,
  getComponentVertexLocation,
  getComponentZoneLocation,
} from "./component-locations";
export {
  getCard,
  getCardOwner,
  getCardsById,
  getCardVisibility,
  getSlotOccupants,
  getSlotOccupantsByHost,
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
  moveComponentToContainerInPlace,
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
