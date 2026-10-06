import { describe, expect, test } from "vitest";
import {
  getAdjacentSpaces,
  getBoard,
  getBoardsByTypeId,
  getEdge,
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
} from "./index";
import {
  createSpatialTable,
  spatialDefinitions,
  spatialIds,
  spatialElements,
} from "./table-test-fixtures";

describe("table ops spatial helpers", () => {
  test("board helpers expose typed board metadata and adjacency for generic and hex boards", () => {
    const table = createSpatialTable();

    expect(getBoard(table, spatialDefinitions, "main-board").layout).toBe(
      "generic",
    );
    expect(getBoard(table, spatialDefinitions, "main-board").typeId).toBe(
      "track",
    );
    expect(getHexBoard(table, spatialDefinitions, "hex-board").layout).toBe(
      "hex",
    );
    expect(
      getHexSpace(table, spatialDefinitions, "hex-board", spatialIds.hexA).q,
    ).toBe(0);
    expect(
      getHexSpaceAt(table, spatialDefinitions, "hex-board", 1, 0)?.id,
    ).toBe(spatialIds.hexB);
    expect(
      getEdge(table, spatialDefinitions, "hex-board", spatialElements().hexEdge)
        .spaceIds,
    ).toEqual([spatialIds.hexA, spatialIds.hexB]);
    expect(
      getVertex(
        table,
        spatialDefinitions,
        "hex-board",
        spatialElements().hexVertex,
      ).spaceIds,
    ).toEqual([spatialIds.hexA, spatialIds.hexB, spatialIds.hexC]);
    expect(
      getSpace(table, spatialDefinitions, "main-board", "space-a"),
    ).toEqual({
      id: "space-a",
      typeId: "slot",
      fields: {},
    });
    expect(getBoardsByTypeId(table, spatialDefinitions, "track")).toEqual([
      "main-board",
    ]);
    expect(
      getSpacesByTypeId(table, spatialDefinitions, "main-board", "slot"),
    ).toEqual(["space-a", "space-b"]);
    expect(
      getSpacesByTypeId(table, spatialDefinitions, "hex-board", "land"),
    ).toEqual([spatialIds.hexA, spatialIds.hexB, spatialIds.hexC]);
    expect(
      getRelatedSpaces(
        table,
        spatialDefinitions,
        "main-board",
        "space-a",
        "adjacent",
      ),
    ).toEqual(["space-b"]);
    expect(
      getAdjacentSpaces(table, spatialDefinitions, "main-board", "space-a"),
    ).toEqual(["space-b"]);
    expect(
      getAdjacentSpaces(
        table,
        spatialDefinitions,
        "hex-board",
        spatialIds.hexA,
      ),
    ).toEqual([spatialIds.hexB, spatialIds.hexC]);
    expect(getTiledBoard(table, spatialDefinitions, "hex-board").layout).toBe(
      "hex",
    );
  });

  test("shared tiled helpers expose square topology, range, and incidence", () => {
    const table = createSpatialTable();

    expect(
      getSquareBoard(table, spatialDefinitions, "square-board").layout,
    ).toBe("square");
    expect(
      getSquareSpace(
        table,
        spatialDefinitions,
        "square-board",
        spatialIds.squareA1,
      ).row,
    ).toBe(0);
    expect(
      getSquareSpaceAt(table, spatialDefinitions, "square-board", 1, 1)?.id,
    ).toBe(spatialIds.squareB2);
    expect(
      getAdjacentSpaces(
        table,
        spatialDefinitions,
        "square-board",
        spatialIds.squareA1,
      ),
    ).toEqual([spatialIds.squareA2, spatialIds.squareB1]);
    expect(
      getSquareNeighbors(
        table,
        spatialDefinitions,
        "square-board",
        spatialIds.squareA1,
      ),
    ).toEqual([spatialIds.squareA2, spatialIds.squareB1]);
    expect(
      getSquareNeighbors(
        table,
        spatialDefinitions,
        "square-board",
        spatialIds.squareA1,
        {
          mode: "diagonal",
        },
      ),
    ).toEqual([spatialIds.squareB2]);
    expect(
      getSquareNeighbors(
        table,
        spatialDefinitions,
        "square-board",
        spatialIds.squareA1,
        {
          mode: "all",
        },
      ),
    ).toEqual([spatialIds.squareA2, spatialIds.squareB1, spatialIds.squareB2]);
    expect(
      getSpaceDistance(
        table,
        spatialDefinitions,
        "square-board",
        spatialIds.squareA1,
        spatialIds.squareB2,
      ),
    ).toBe(2);
    expect(
      getSquareDistance(
        table,
        spatialDefinitions,
        "square-board",
        spatialIds.squareA1,
        spatialIds.squareB2,
      ),
    ).toBe(2);
    expect(
      getSquareDistance(
        table,
        spatialDefinitions,
        "square-board",
        spatialIds.squareA1,
        spatialIds.squareB2,
        {
          metric: "chebyshev",
        },
      ),
    ).toBe(1);
    const edges = getSpaceEdges(
      table,
      spatialDefinitions,
      "square-board",
      spatialIds.squareA1,
    );
    const vertices = getSpaceVertices(
      table,
      spatialDefinitions,
      "square-board",
      spatialIds.squareA1,
    );
    expect(edges).toHaveLength(4);
    expect(edges).toContain(spatialElements().squareEdge);
    expect(vertices).toHaveLength(4);
    expect(vertices).toContain(spatialElements().squareVertex);
    const incident = getIncidentEdges(
      table,
      spatialDefinitions,
      "square-board",
      spatialElements().squareVertex,
    );
    expect(incident).toHaveLength(4);
    expect(incident).toContain(spatialElements().squareEdge);
    const endpoints = getIncidentVertices(
      table,
      spatialDefinitions,
      "square-board",
      spatialElements().squareEdge,
    );
    expect(endpoints).toHaveLength(2);
    expect(endpoints).toContain(spatialElements().squareVertex);
  });
});
