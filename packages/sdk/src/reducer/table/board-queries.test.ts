import { describe, expect, test } from "bun:test";
import {
  getAdjacentSpaces,
  getBoard,
  getBoardsByTypeId,
  getContainer,
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
import { createSpatialTable } from "./table-test-fixtures";

describe("table ops spatial helpers", () => {
  test("board helpers expose typed board metadata and adjacency for generic and hex boards", () => {
    const table = createSpatialTable();

    expect(getBoard(table, "main-board").layout).toBe("generic");
    expect(getBoard(table, "main-board").typeId).toBe("track");
    expect(getHexBoard(table, "hex-board").layout).toBe("hex");
    expect(getHexSpace(table, "hex-board", "tile-a").q).toBe(0);
    expect(getHexSpaceAt(table, "hex-board", 1, 0)?.id).toBe("tile-b");
    expect(getEdge(table, "hex-board", "tile-a$$tile-b").spaceIds).toEqual([
      "tile-a",
      "tile-b",
    ]);
    expect(
      getVertex(table, "hex-board", "tile-a$$tile-a$$tile-b").spaceIds,
    ).toEqual(["tile-a", "tile-a", "tile-b"]);
    expect(getSpace(table, "main-board", "space-a").zoneId).toBe(
      "main-board::space::space-a",
    );
    expect(getContainer(table, "main-board", "market-row").name).toBe(
      "Market Row",
    );
    expect(getBoardsByTypeId(table, "track")).toEqual(["main-board"]);
    expect(getSpacesByTypeId(table, "main-board", "slot")).toEqual([
      "space-a",
      "space-b",
    ]);
    expect(getSpacesByTypeId(table, "hex-board", "forest")).toEqual(["tile-a"]);
    expect(
      getRelatedSpaces(table, "main-board", "space-a", "adjacent"),
    ).toEqual(["space-b"]);
    expect(getAdjacentSpaces(table, "main-board", "space-a")).toEqual([
      "space-b",
    ]);
    expect(getAdjacentSpaces(table, "hex-board", "tile-a")).toEqual(["tile-b"]);
    expect(getTiledBoard(table, "hex-board").layout).toBe("hex");
  });

  test("shared tiled helpers expose square topology, range, and incidence", () => {
    const table = createSpatialTable();

    expect(getSquareBoard(table, "square-board").layout).toBe("square");
    expect(getSquareSpace(table, "square-board", "cell-a1").row).toBe(0);
    expect(getSquareSpaceAt(table, "square-board", 1, 1)?.id).toBe("cell-b2");
    expect(getAdjacentSpaces(table, "square-board", "cell-a1")).toEqual([
      "cell-a2",
      "cell-b1",
    ]);
    expect(getSquareNeighbors(table, "square-board", "cell-a1")).toEqual([
      "cell-a2",
      "cell-b1",
    ]);
    expect(
      getSquareNeighbors(table, "square-board", "cell-a1", {
        mode: "diagonal",
      }),
    ).toEqual(["cell-b2"]);
    expect(
      getSquareNeighbors(table, "square-board", "cell-a1", {
        mode: "all",
      }),
    ).toEqual(["cell-a2", "cell-b1", "cell-b2"]);
    expect(getSpaceDistance(table, "square-board", "cell-a1", "cell-b2")).toBe(
      2,
    );
    expect(getSquareDistance(table, "square-board", "cell-a1", "cell-b2")).toBe(
      2,
    );
    expect(
      getSquareDistance(table, "square-board", "cell-a1", "cell-b2", {
        metric: "chebyshev",
      }),
    ).toBe(1);
    expect(getSpaceEdges(table, "square-board", "cell-a1")).toEqual([
      "square-edge:a1-a2",
      "square-edge:a1-b1",
    ]);
    expect(getSpaceVertices(table, "square-board", "cell-a1")).toEqual([
      "square-vertex:center",
    ]);
    expect(
      getIncidentEdges(table, "square-board", "square-vertex:center"),
    ).toEqual(["square-edge:a1-a2", "square-edge:a1-b1"]);
    expect(
      getIncidentVertices(table, "square-board", "square-edge:a1-a2"),
    ).toEqual(["square-vertex:center"]);
  });
});
