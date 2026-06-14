import type {
  BoardContainerIdOfTable,
  BoardIdOfTable,
  ComponentIdOfTable,
  HexBoardIdOfTable,
  HexEdgeIdOfTable,
  HexVertexIdOfTable,
  PlayerIdOfTable,
  PlayerZoneIdOfTable,
  RuntimeComponentLocation,
  RuntimeTableRecord,
  SharedZoneIdOfTable,
  SpaceIdOfTable,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledVertexIdOfTable,
} from "../model";
import {
  getComponentsInContainer,
  getComponentsOnEdge,
  getComponentsOnSpace,
  getComponentsOnVertex,
  getEdge,
  getVertex,
} from "./board-queries";
import { assertCardAllowedInContainer } from "./card-validation";
import { cloneRuntimeTable } from "./clone";
import {
  ensureArray,
  orderedComponentIdsForLocation,
  ppRead,
  syncPlayerZoneWithHand,
  syncSharedZoneWithDeck,
} from "./internal";

function reindexSpaceOccupants<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<Table>,
  SpaceId extends SpaceIdOfTable<Table, BoardId>,
>(table: Table, boardId: BoardId, spaceId: SpaceId): void {
  getComponentsOnSpace(table, boardId, spaceId).forEach(
    (componentId, index) => {
      const location = table.componentLocations[componentId];
      if (location?.type === "OnSpace") {
        table.componentLocations[componentId] = {
          ...location,
          position: index,
        };
      }
    },
  );
}

function reindexContainerOccupants<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<Table>,
  ContainerId extends BoardContainerIdOfTable<Table, BoardId>,
>(table: Table, boardId: BoardId, containerId: ContainerId): void {
  getComponentsInContainer(table, boardId, containerId).forEach(
    (componentId, index) => {
      const location = table.componentLocations[componentId];
      if (location?.type === "InContainer") {
        table.componentLocations[componentId] = {
          ...location,
          position: index,
        };
      }
    },
  );
}

function reindexEdgeOccupants<
  Table extends RuntimeTableRecord,
  BoardId extends HexBoardIdOfTable<Table>,
  EdgeId extends HexEdgeIdOfTable<Table, BoardId>,
>(table: Table, boardId: BoardId, edgeId: EdgeId): void {
  orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "OnEdge" &&
      location.boardId === boardId &&
      location.edgeId === edgeId,
  ).forEach((componentId, index) => {
    const location = table.componentLocations[componentId];
    if (location?.type === "OnEdge") {
      table.componentLocations[componentId] = {
        ...location,
        position: index,
      };
    }
  });
}

function reindexVertexOccupants<
  Table extends RuntimeTableRecord,
  BoardId extends HexBoardIdOfTable<Table>,
  VertexId extends HexVertexIdOfTable<Table, BoardId>,
>(table: Table, boardId: BoardId, vertexId: VertexId): void {
  orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "OnVertex" &&
      location.boardId === boardId &&
      location.vertexId === vertexId,
  ).forEach((componentId, index) => {
    const location = table.componentLocations[componentId];
    if (location?.type === "OnVertex") {
      table.componentLocations[componentId] = {
        ...location,
        position: index,
      };
    }
  });
}

function reindexSlotOccupants<Table extends RuntimeTableRecord>(
  table: Table,
  host: Extract<RuntimeComponentLocation, { type: "InSlot" }>["host"],
  slotId: string,
): void {
  orderedComponentIdsForLocation(
    table,
    (location) =>
      location.type === "InSlot" &&
      location.host.kind === host.kind &&
      location.host.id === host.id &&
      location.slotId === slotId,
  ).forEach((componentId, index) => {
    const location = table.componentLocations[componentId];
    if (location?.type === "InSlot") {
      table.componentLocations[componentId] = {
        ...location,
        position: index,
      };
    }
  });
}

function removeComponentFromCurrentLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
>(table: Table, componentId: ComponentId): void {
  const currentLocation = table.componentLocations[componentId];
  if (!currentLocation) {
    return;
  }

  if (currentLocation.type === "InDeck") {
    const nextCards = ensureArray(table.decks[currentLocation.deckId]).filter(
      (candidate) => candidate !== componentId,
    );
    syncSharedZoneWithDeck(
      table,
      currentLocation.deckId as SharedZoneIdOfTable<Table>,
      nextCards,
    );
    nextCards.forEach((cardId, index) => {
      const location = table.componentLocations[cardId];
      if (location?.type === "InDeck") {
        table.componentLocations[cardId] = {
          ...location,
          position: index,
        };
      }
    });
    return;
  }

  if (currentLocation.type === "InHand") {
    const nextCards = ensureArray(
      ppRead(table.hands[currentLocation.handId], currentLocation.playerId),
    ).filter((candidate) => candidate !== componentId);
    syncPlayerZoneWithHand(
      table,
      currentLocation.handId as PlayerZoneIdOfTable<Table>,
      currentLocation.playerId as PlayerIdOfTable<Table>,
      nextCards,
    );
    nextCards.forEach((cardId, index) => {
      const location = table.componentLocations[cardId];
      if (location?.type === "InHand") {
        table.componentLocations[cardId] = {
          ...location,
          position: index,
        };
      }
    });
    return;
  }

  if (currentLocation.type === "OnSpace") {
    delete table.componentLocations[componentId];
    reindexSpaceOccupants(
      table,
      currentLocation.boardId as BoardIdOfTable<Table>,
      currentLocation.spaceId as SpaceIdOfTable<Table, BoardIdOfTable<Table>>,
    );
    return;
  }

  if (currentLocation.type === "InZone") {
    if (currentLocation.zoneId in table.zones.shared) {
      const nextComponents = ensureArray(
        table.zones.shared[currentLocation.zoneId],
      ).filter((candidate) => candidate !== componentId);
      syncSharedZoneWithDeck(
        table,
        currentLocation.zoneId as SharedZoneIdOfTable<Table>,
        nextComponents,
      );
      nextComponents.forEach((currentComponentId, index) => {
        const location = table.componentLocations[currentComponentId];
        if (location?.type === "InZone") {
          table.componentLocations[currentComponentId] = {
            ...location,
            position: index,
          };
        }
      });
    }
    delete table.componentLocations[componentId];
    return;
  }

  if (currentLocation.type === "InContainer") {
    delete table.componentLocations[componentId];
    reindexContainerOccupants(
      table,
      currentLocation.boardId as BoardIdOfTable<Table>,
      currentLocation.containerId as BoardContainerIdOfTable<
        Table,
        BoardIdOfTable<Table>
      >,
    );
    return;
  }

  if (currentLocation.type === "OnEdge") {
    delete table.componentLocations[componentId];
    reindexEdgeOccupants(
      table,
      currentLocation.boardId as HexBoardIdOfTable<Table>,
      currentLocation.edgeId as HexEdgeIdOfTable<
        Table,
        HexBoardIdOfTable<Table>
      >,
    );
    return;
  }

  if (currentLocation.type === "OnVertex") {
    delete table.componentLocations[componentId];
    reindexVertexOccupants(
      table,
      currentLocation.boardId as HexBoardIdOfTable<Table>,
      currentLocation.vertexId as HexVertexIdOfTable<
        Table,
        HexBoardIdOfTable<Table>
      >,
    );
    return;
  }

  if (currentLocation.type === "InSlot") {
    delete table.componentLocations[componentId];
    reindexSlotOccupants(table, currentLocation.host, currentLocation.slotId);
    return;
  }

  delete table.componentLocations[componentId];
}

export function moveComponentToSpace<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  componentId: ComponentId,
  boardId: BoardId,
  spaceId: SpaceId,
): Table {
  const nextTable = cloneRuntimeTable(table);
  moveComponentToSpaceInPlace(nextTable, componentId, boardId, spaceId);
  return nextTable;
}

export function moveComponentToSpaceInPlace<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  SpaceId extends SpaceIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  componentId: ComponentId,
  boardId: BoardId,
  spaceId: SpaceId,
): void {
  const position = getComponentsOnSpace(table, boardId, spaceId).length;
  removeComponentFromCurrentLocation(table, componentId);
  table.componentLocations[componentId] = {
    type: "OnSpace",
    boardId,
    spaceId,
    position,
  };
}

export function moveComponentToContainer<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  ContainerId extends BoardContainerIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  componentId: ComponentId,
  boardId: BoardId,
  containerId: ContainerId,
): Table {
  const nextTable = cloneRuntimeTable(table);
  moveComponentToContainerInPlace(nextTable, componentId, boardId, containerId);
  return nextTable;
}

export function moveComponentToContainerInPlace<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
  BoardId extends BoardIdOfTable<NoInfer<Table>>,
  ContainerId extends BoardContainerIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  componentId: ComponentId,
  boardId: BoardId,
  containerId: ContainerId,
): void {
  assertCardAllowedInContainer(table, boardId, containerId, componentId);
  const position = getComponentsInContainer(table, boardId, containerId).length;
  removeComponentFromCurrentLocation(table, componentId);
  table.componentLocations[componentId] = {
    type: "InContainer",
    boardId,
    containerId,
    position,
  };
}

export function moveComponentToDetached<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
>(table: Table, componentId: ComponentId): Table {
  const nextTable = cloneRuntimeTable(table);
  moveComponentToDetachedInPlace(nextTable, componentId);
  return nextTable;
}

export function moveComponentToDetachedInPlace<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
>(table: Table, componentId: ComponentId): void {
  removeComponentFromCurrentLocation(table, componentId);
  table.componentLocations[componentId] = { type: "Detached" };
}

export function moveComponentToEdge<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  EdgeId extends TiledEdgeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  componentId: ComponentId,
  boardId: BoardId,
  edgeId: EdgeId,
): Table {
  const nextTable = cloneRuntimeTable(table);
  moveComponentToEdgeInPlace(nextTable, componentId, boardId, edgeId);
  return nextTable;
}

export function moveComponentToEdgeInPlace<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  EdgeId extends TiledEdgeIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  componentId: ComponentId,
  boardId: BoardId,
  edgeId: EdgeId,
): void {
  getEdge(table, boardId, edgeId);
  const position = getComponentsOnEdge(table, boardId, edgeId).length;
  removeComponentFromCurrentLocation(table, componentId);
  table.componentLocations[componentId] = {
    type: "OnEdge",
    boardId,
    edgeId,
    position,
  };
}

export function moveComponentToVertex<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  VertexId extends TiledVertexIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  componentId: ComponentId,
  boardId: BoardId,
  vertexId: VertexId,
): Table {
  const nextTable = cloneRuntimeTable(table);
  moveComponentToVertexInPlace(nextTable, componentId, boardId, vertexId);
  return nextTable;
}

export function moveComponentToVertexInPlace<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
  BoardId extends TiledBoardIdOfTable<NoInfer<Table>>,
  VertexId extends TiledVertexIdOfTable<NoInfer<Table>, BoardId>,
>(
  table: Table,
  componentId: ComponentId,
  boardId: BoardId,
  vertexId: VertexId,
): void {
  getVertex(table, boardId, vertexId);
  const position = getComponentsOnVertex(table, boardId, vertexId).length;
  removeComponentFromCurrentLocation(table, componentId);
  table.componentLocations[componentId] = {
    type: "OnVertex",
    boardId,
    vertexId,
    position,
  };
}
