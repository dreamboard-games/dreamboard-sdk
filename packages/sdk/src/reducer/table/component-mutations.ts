import { resolveZone, assertComponent } from "./zones";
import type {
  BoardIdOfTable,
  ComponentIdOfTable,
  RuntimeTableRecord,
  ZoneDefinitions,
  SpaceIdOfTable,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledVertexIdOfTable,
} from "../model";
import {
  getComponentsOnEdge,
  getComponentsOnSpace,
  getComponentsOnVertex,
  getEdge,
  getVertex,
} from "./board-queries";
import { orderedComponentIdsForLocation } from "./internal";

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

function reindexEdgeOccupants(
  table: RuntimeTableRecord,
  boardId: string,
  edgeId: string,
): void {
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

function reindexVertexOccupants(
  table: RuntimeTableRecord,
  boardId: string,
  vertexId: string,
): void {
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

export function removeComponentFromCurrentLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
>(table: Table, componentId: ComponentId, definitions: ZoneDefinitions): void {
  assertComponent(table, componentId);
  const currentLocation = table.componentLocations[componentId];
  if (!currentLocation) {
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
    const { ids } = resolveZone(table, definitions, currentLocation);
    if (!ids || ids.filter((id) => id === componentId).length !== 1)
      throw new Error(
        `Zone membership disagrees with location for '${componentId}'.`,
      );
    ids.splice(ids.indexOf(componentId), 1);
    delete table.componentLocations[componentId];
    return;
  }

  if (currentLocation.type === "OnEdge") {
    delete table.componentLocations[componentId];
    reindexEdgeOccupants(
      table,
      currentLocation.boardId,
      currentLocation.edgeId,
    );
    return;
  }

  if (currentLocation.type === "OnVertex") {
    delete table.componentLocations[componentId];
    reindexVertexOccupants(
      table,
      currentLocation.boardId,
      currentLocation.vertexId,
    );
    return;
  }

  delete table.componentLocations[componentId];
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
  definitions: ZoneDefinitions,
): void {
  const position = getComponentsOnSpace(table, boardId, spaceId).length;
  removeComponentFromCurrentLocation(table, componentId, definitions);
  table.componentLocations[componentId] = {
    type: "OnSpace",
    boardId,
    spaceId,
    position,
  };
}

export function moveComponentToDetachedInPlace<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
>(table: Table, componentId: ComponentId, definitions: ZoneDefinitions): void {
  removeComponentFromCurrentLocation(table, componentId, definitions);
  table.componentLocations[componentId] = { type: "Detached" };
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
  definitions: ZoneDefinitions,
): void {
  getEdge(table, boardId, edgeId);
  const position = getComponentsOnEdge(table, boardId, edgeId).length;
  removeComponentFromCurrentLocation(table, componentId, definitions);
  table.componentLocations[componentId] = {
    type: "OnEdge",
    boardId,
    edgeId,
    position,
  };
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
  definitions: ZoneDefinitions,
): void {
  getVertex(table, boardId, vertexId);
  const position = getComponentsOnVertex(table, boardId, vertexId).length;
  removeComponentFromCurrentLocation(table, componentId, definitions);
  table.componentLocations[componentId] = {
    type: "OnVertex",
    boardId,
    vertexId,
    position,
  };
}
