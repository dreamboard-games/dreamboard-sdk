import { createTestTransaction } from "../transaction-test-fixtures";
import { describe, expect, test } from "vitest";
import {
  getZoneComponents,
  getComponentsOnEdge,
  getComponentsOnSpace,
  getComponentsOnVertex,
} from "./index";
import { createSpatialTable, spatialDefinitions } from "./table-test-fixtures";

describe("table ops spatial helpers", () => {
  test("moveComponentToSpace and moveComponentToZone re-home cards, pieces, and dice", () => {
    const table = createSpatialTable();

    const withCardInContainer = createTestTransaction(
      {
        table,
      },
      spatialDefinitions,
    ).moveComponentToZone({
      componentId: "card-1",
      to: { zoneId: "market-row", hostId: "main-board" },
    }).table;
    const withPieceOnSpace = createTestTransaction(
      {
        table: withCardInContainer,
      },
      spatialDefinitions,
    ).moveComponentToSpace({
      componentId: "piece-1",
      boardId: "main-board",
      spaceId: "space-a",
    }).table;
    const withDieOnSpace = createTestTransaction(
      {
        table: withPieceOnSpace,
      },
      spatialDefinitions,
    ).moveComponentToSpace({
      componentId: "die-1",
      boardId: "main-board",
      spaceId: "space-a",
    }).table;

    expect(withDieOnSpace.zones["draw-deck"].table).toEqual([]);
    expect(withDieOnSpace.zones.supply.table).toEqual([]);
    expect(withDieOnSpace.componentLocations["card-1"]).toEqual({
      type: "InZone",
      zoneId: "market-row",
      hostId: "main-board",
      playedBy: null,
    });
    expect(withDieOnSpace.componentLocations["piece-1"]).toEqual({
      type: "OnSpace",
      boardId: "main-board",
      spaceId: "space-a",
      position: 0,
    });
    expect(withDieOnSpace.componentLocations["die-1"]).toEqual({
      type: "OnSpace",
      boardId: "main-board",
      spaceId: "space-a",
      position: 1,
    });
    expect(
      getZoneComponents(withDieOnSpace, spatialDefinitions, {
        zoneId: "market-row",
        hostId: "main-board",
      }),
    ).toEqual(["card-1"]);
    expect(
      getComponentsOnSpace(withDieOnSpace, "main-board", "space-a"),
    ).toEqual(["piece-1", "die-1"]);
  });

  test("moveComponentToDetached re-homes pieces and reindexes old occupants", () => {
    const table = createSpatialTable();
    const withPieceOnSpace = createTestTransaction(
      {
        table,
      },
      spatialDefinitions,
    ).moveComponentToSpace({
      componentId: "piece-1",
      boardId: "main-board",
      spaceId: "space-a",
    }).table;
    const withDieOnSpace = createTestTransaction(
      {
        table: withPieceOnSpace,
      },
      spatialDefinitions,
    ).moveComponentToSpace({
      componentId: "die-1",
      boardId: "main-board",
      spaceId: "space-a",
    }).table;

    const detached = createTestTransaction(
      {
        table: withDieOnSpace,
      },
      spatialDefinitions,
    ).moveComponentToDetached({ componentId: "piece-1" }).table;

    expect(detached.componentLocations["piece-1"]).toEqual({
      type: "Detached",
    });
    expect(getComponentsOnSpace(detached, "main-board", "space-a")).toEqual([
      "die-1",
    ]);
    expect(detached.componentLocations["die-1"]).toEqual({
      type: "OnSpace",
      boardId: "main-board",
      spaceId: "space-a",
      position: 0,
    });
  });

  test("moveComponentToEdge and moveComponentToVertex validate targets and preserve stable ordering", () => {
    const table = createSpatialTable();

    expect(
      () =>
        void Reflect.apply(
          createTestTransaction({ table }).moveComponentToEdge,
          undefined,
          [
            {
              componentId: "piece-1",
              boardId: "square-board",
              edgeId: "missing-edge",
            },
          ],
        ),
    ).toThrow("Unknown edge");
    expect(
      () =>
        void Reflect.apply(
          createTestTransaction({ table }).moveComponentToVertex,
          undefined,
          [
            {
              componentId: "piece-1",
              boardId: "square-board",
              vertexId: "missing-vertex",
            },
          ],
        ),
    ).toThrow("Unknown vertex");

    const withPieceOnEdge = createTestTransaction(
      {
        table,
      },
      spatialDefinitions,
    ).moveComponentToEdge({
      componentId: "piece-1",
      boardId: "square-board",
      edgeId: "square-edge:a1-a2",
    }).table;
    const withDieOnEdge = createTestTransaction(
      {
        table: withPieceOnEdge,
      },
      spatialDefinitions,
    ).moveComponentToEdge({
      componentId: "die-1",
      boardId: "square-board",
      edgeId: "square-edge:a1-a2",
    }).table;
    const withPieceOnVertex = createTestTransaction(
      {
        table: withDieOnEdge,
      },
      spatialDefinitions,
    ).moveComponentToVertex({
      componentId: "piece-1",
      boardId: "square-board",
      vertexId: "square-vertex:center",
    }).table;

    expect(
      getComponentsOnEdge(withDieOnEdge, "square-board", "square-edge:a1-a2"),
    ).toEqual(["piece-1", "die-1"]);
    expect(
      getComponentsOnVertex(
        withPieceOnVertex,
        "square-board",
        "square-vertex:center",
      ),
    ).toEqual(["piece-1"]);
  });

  test("moving a component out preserves other attached host memberships and order", () => {
    const table = createSpatialTable();
    for (const id of ["piece-2", "piece-3", "host-piece"])
      table.pieces[id] = { id, pieceTypeId: "token", properties: {} };
    table.dice["host-die"] = {
      id: "host-die",
      dieTypeId: "d6",
      sides: 6,
      properties: {},
    };
    table.componentLocations["host-piece"] = { type: "Detached" };
    table.componentLocations["host-die"] = { type: "Detached" };
    table.zones.supply.table = ["die-1"];
    table.zones.worker = { "host-piece": ["piece-1", "piece-2"] };
    table.zones.rest = { "host-die": ["piece-3"] };
    table.componentLocations["piece-1"] = {
      type: "InZone",
      zoneId: "worker",
      hostId: "host-piece",
      playedBy: null,
    };
    table.componentLocations["piece-2"] = {
      type: "InZone",
      zoneId: "worker",
      hostId: "host-piece",
      playedBy: null,
    };
    table.componentLocations["piece-3"] = {
      type: "InZone",
      zoneId: "rest",
      hostId: "host-die",
      playedBy: null,
    };
    const definitions = {
      zoneDefinitions: {
        ...spatialDefinitions.zoneDefinitions,
        worker: {
          attachedTo: { pieceType: "token" },
          visibility: "public",
          allowedCardSetIds: [],
        },
        rest: {
          attachedTo: { dieType: "d6" },
          visibility: "public",
          allowedCardSetIds: [],
        },
      },
    } as const;
    const moved = createTestTransaction(
      { table },
      definitions,
    ).moveComponentToSpace({
      componentId: "piece-1",
      boardId: "main-board",
      spaceId: "space-a",
    }).table;
    expect(moved.componentLocations["piece-1"]).toEqual({
      type: "OnSpace",
      boardId: "main-board",
      spaceId: "space-a",
      position: 0,
    });
    expect(moved.zones.worker["host-piece"]).toEqual(["piece-2"]);
    expect(moved.zones.rest["host-die"]).toEqual(["piece-3"]);
    expect(moved.componentLocations["piece-2"]).toEqual(
      table.componentLocations["piece-2"],
    );
    expect(moved.componentLocations["piece-3"]).toEqual(
      table.componentLocations["piece-3"],
    );
  });
});
