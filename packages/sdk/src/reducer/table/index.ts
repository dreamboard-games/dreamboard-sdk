export { ensureArray } from "./internal";
export { cloneRuntimeTable } from "./clone";
export {
  assertCardAllowedInContainer,
  assertCardAllowedInZone,
} from "./card-validation";
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
  getComponentDeckLocation,
  getComponentEdgeLocation,
  getComponentHandLocation,
  getComponentLocation,
  getComponentSlotLocation,
  getComponentSpaceLocation,
  getComponentVertexLocation,
  getComponentZoneLocation,
} from "./component-locations";
export {
  getAllPlayerZoneCards,
  getAllSharedZoneCards,
  getCard,
  getCardOwner,
  getCardsById,
  getCardVisibility,
  getPlayerZoneCardCollection,
  getPlayerZoneCards,
  getSharedZoneCardCollection,
  getSharedZoneCards,
  getSlotOccupants,
  getSlotOccupantsByHost,
} from "./zone-queries";
export {
  addPlayerResources,
  canAffordResources,
  getMissingResources,
  getNextPlayerInOrder,
  getPlayerOrder,
  getPlayerResourceAmount,
  getPlayerResources,
  getPlayerResourceTotal,
  setPlayerResource,
  spendPlayerResources,
  transferPlayerResources,
} from "./resource-ops";
export {
  moveComponentToContainer,
  moveComponentToDetached,
  moveComponentToEdge,
  moveComponentToSpace,
  moveComponentToVertex,
} from "./component-mutations";
export {
  addCardToSharedZone,
  dealCardsBetweenPlayerZones,
  dealCardsFromDeckToHand,
  moveCardBetweenPlayerZones,
  moveCardBetweenSharedZones,
  moveCardFromPlayerZoneToSharedZone,
  moveCardFromSharedZoneToPlayerZone,
  removeCardFromSharedZone,
  shufflePlayerZoneCards,
} from "./card-mutations";
export { setActivePlayers, setPhaseState } from "./phase-state";

export type { RuntimeTableRecord, TableOfState, CardIdOfState } from "../model";
