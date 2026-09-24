import { createTestTransaction } from "../transaction-test-fixtures";
import { describe, expect, test } from "vitest";
import {
  getComponentsInContainer,
  getComponentsOnEdge,
  getComponentsOnSpace,
  getComponentsOnVertex,
} from "./index";
import { createSpatialTable } from "./table-test-fixtures";

describe("table ops spatial helpers", () => {
  test("moveComponentToSpace and moveComponentToContainer re-home cards, pieces, and dice", () => {
    const table = createSpatialTable();

    const withCardInContainer = createTestTransaction({
      table,
    }).moveComponentToContainer({
      componentId: "card-1",
      boardId: "main-board",
      containerId: "market-row",
    }).table;
    const withPieceOnSpace = createTestTransaction({
      table: withCardInContainer,
    }).moveComponentToSpace({
      componentId: "piece-1",
      boardId: "main-board",
      spaceId: "space-a",
    }).table;
    const withDieOnSpace = createTestTransaction({
      table: withPieceOnSpace,
    }).moveComponentToSpace({
      componentId: "die-1",
      boardId: "main-board",
      spaceId: "space-a",
    }).table;

    expect(withDieOnSpace.decks["draw-deck"]).toEqual([]);
    expect(withDieOnSpace.zones.shared.supply).toEqual([]);
    expect(withDieOnSpace.componentLocations["card-1"]).toEqual({
      type: "InContainer",
      boardId: "main-board",
      containerId: "market-row",
      position: 0,
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
      getComponentsInContainer(withDieOnSpace, "main-board", "market-row"),
    ).toEqual(["card-1"]);
    expect(
      getComponentsOnSpace(withDieOnSpace, "main-board", "space-a"),
    ).toEqual(["piece-1", "die-1"]);
  });

  test("moveComponentToDetached re-homes pieces and reindexes old occupants", () => {
    const table = createSpatialTable();
    const withPieceOnSpace = createTestTransaction({
      table,
    }).moveComponentToSpace({
      componentId: "piece-1",
      boardId: "main-board",
      spaceId: "space-a",
    }).table;
    const withDieOnSpace = createTestTransaction({
      table: withPieceOnSpace,
    }).moveComponentToSpace({
      componentId: "die-1",
      boardId: "main-board",
      spaceId: "space-a",
    }).table;

    const detached = createTestTransaction({
      table: withDieOnSpace,
    }).moveComponentToDetached({ componentId: "piece-1" }).table;

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

    expect(() =>
      createTestTransaction({ table }).moveComponentToEdge({
        componentId: "piece-1",
        boardId: "square-board",
        edgeId: "missing-edge" as never,
      }),
    ).toThrow("Unknown edge");
    expect(() =>
      createTestTransaction({ table }).moveComponentToVertex({
        componentId: "piece-1",
        boardId: "square-board",
        vertexId: "missing-vertex" as never,
      }),
    ).toThrow("Unknown vertex");

    const withPieceOnEdge = createTestTransaction({
      table,
    }).moveComponentToEdge({
      componentId: "piece-1",
      boardId: "square-board",
      edgeId: "square-edge:a1-a2",
    }).table;
    const withDieOnEdge = createTestTransaction({
      table: withPieceOnEdge,
    }).moveComponentToEdge({
      componentId: "die-1",
      boardId: "square-board",
      edgeId: "square-edge:a1-a2",
    }).table;
    const withPieceOnVertex = createTestTransaction({
      table: withDieOnEdge,
    }).moveComponentToVertex({
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

  test("moving a component out of a slot reindexes only matching structured slot hosts", () => {
    const table = createSpatialTable();
    table.pieces["piece-2"] = {
      id: "piece-2",
      pieceTypeId: "token",
      properties: {},
    };
    table.pieces["piece-3"] = {
      id: "piece-3",
      pieceTypeId: "token",
      properties: {},
    };
    table.componentLocations["piece-1"] = {
      type: "InSlot",
      host: {
        kind: "piece",
        id: "host-a",
      },
      slotId: "worker-rest",
      position: 0,
    };
    table.componentLocations["piece-2"] = {
      type: "InSlot",
      host: {
        kind: "piece",
        id: "host-a",
      },
      slotId: "worker-rest",
      position: 1,
    };
    table.componentLocations["piece-3"] = {
      type: "InSlot",
      host: {
        kind: "die",
        id: "host-a",
      },
      slotId: "worker-rest",
      position: 0,
    };

    const moved = createTestTransaction({
      table,
    }).moveComponentToSpace({
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
    expect(moved.componentLocations["piece-2"]).toEqual({
      type: "InSlot",
      host: {
        kind: "piece",
        id: "host-a",
      },
      slotId: "worker-rest",
      position: 0,
    });
    expect(moved.componentLocations["piece-3"]).toEqual({
      type: "InSlot",
      host: {
        kind: "die",
        id: "host-a",
      },
      slotId: "worker-rest",
      position: 0,
    });
  });
});
