import { deriveBoardTopology } from "./board-topology.js";
import { perPlayerInstanceId } from "./domain/per-player-instance.js";
import { boardEdgeId, boardVertexId } from "./domain/board-element.js";
import { describe, expect, test } from "vitest";
import { BoardTopologyMapSchema } from "./board-topology-schema.js";
import { tileSpaceId } from "./domain/tile-space.js";
import { MAXIMUM_BOARD_COORDINATE } from "./domain/board-coordinates.js";

function projection() {
  const id = tileSpaceId('tile:"/one', "cell");
  return {
    main: {
      id: "main",
      baseId: "main",
      name: "Main",
      scope: "shared",
      layout: "hex",
      orientation: "pointy",
      fields: {},
      relations: [],
      spaces: {
        [id]: {
          id,
          tileId: 'tile:"/one',
          localCellId: "cell",
          fields: {},
          q: 0,
          r: 0,
        },
      },
      edges: [],
      vertices: [],
    },
  };
}

function tiledProjection() {
  const topology = deriveBoardTopology(
    {
      boards: { main: { baseId: "main", relations: [] } },
      tiles: { tile: { id: "tile", tileTypeId: "face" } },
      componentLocations: {
        tile: {
          type: "OnBoard",
          layout: "hex",
          boardId: "main",
          q: 0,
          r: 0,
          rotation: 0,
        },
      },
    },
    {
      boardDefinitions: {
        main: {
          id: "main",
          name: "Main",
          scope: "shared",
          layout: "hex",
          orientation: "pointy",
          fields: {},
        },
      },
      tileDefinitions: {
        face: {
          id: "face",
          name: "Face",
          layout: "hex",
          fields: {},
          cells: [{ id: "cell", at: { q: 0, r: 0 }, fields: {} }],
          edges: [],
          vertices: [],
        },
      },
    },
    "main",
  );
  const main = BoardTopologyMapSchema.parse({ main: topology }).main;
  if (main.layout !== "hex") throw new Error("Expected hex topology.");
  return { main };
}

describe("projected topology admission", () => {
  test("admits the canonical derived presentation shape", () => {
    expect(BoardTopologyMapSchema.parse(projection())).toEqual(projection());
  });
  test("rejects mismatched board and cell record identities", () => {
    const board = projection();
    board.main.id = "other";
    expect(() => BoardTopologyMapSchema.parse(board)).toThrow(/Record key/);
    const cell = projection();
    // @ts-expect-error Deliberately violates the declared cell identity.
    cell.main.spaces[tileSpaceId('tile:"/one', "cell")].id = tileSpaceId(
      "other",
      "cell",
    );
    expect(() => BoardTopologyMapSchema.parse(cell)).toThrow(
      /Record key|Tile space identity/,
    );
  });
  test("rejects a tuple that does not identify the declared tile and local cell", () => {
    const value = projection();
    value.main.spaces[tileSpaceId('tile:"/one', "cell")].localCellId = "other";
    expect(() => BoardTopologyMapSchema.parse(value)).toThrow(
      /Tile space identity/,
    );
  });
  test("rejects world elements from a different board or layout", () => {
    const value = projection();
    const vertexIds = [
      boardVertexId("hex", "main", "0,0:v0"),
      boardVertexId("hex", "main", "0,0:v1"),
    ] as const;
    const edge = {
      id: boardEdgeId("hex", "other", "0,0:e0"),
      spaceIds: [],
      vertexIds: [...vertexIds],
      fields: {},
    };
    expect(() =>
      BoardTopologyMapSchema.parse({ main: { ...value.main, edges: [edge] } }),
    ).toThrow(/board and layout/);
    expect(() =>
      BoardTopologyMapSchema.parse({
        main: {
          ...value.main,
          vertices: [
            {
              id: boardVertexId("square", "main", "0,0"),
              spaceIds: [],
              edgeIds: [],
              fields: {},
            },
          ],
        },
      }),
    ).toThrow(/board and layout/);
    expect(() =>
      BoardTopologyMapSchema.parse({
        main: { ...value.main, edges: [{ ...edge, id: "main:edge:0,0:e0" }] },
      }),
    ).toThrow();
  });
  test("rejects missing incidence members, duplicate elements and one-way incidence", () => {
    const absent = tiledProjection();
    absent.main.vertices.pop();
    expect(() => BoardTopologyMapSchema.parse(absent)).toThrow(
      /Incidence reference/,
    );
    const unknownSpace = tiledProjection();
    unknownSpace.main.edges[0].spaceIds.push("absent");
    expect(() => BoardTopologyMapSchema.parse(unknownSpace)).toThrow(
      /Incidence reference/,
    );
    const duplicates = tiledProjection();
    duplicates.main.edges.push(duplicates.main.edges[0]);
    duplicates.main.vertices.push(duplicates.main.vertices[0]);
    expect(() => BoardTopologyMapSchema.parse(duplicates)).toThrow(
      /identities must be unique/,
    );
    const asymmetry = tiledProjection();
    asymmetry.main.vertices[0].edgeIds = [];
    expect(() => BoardTopologyMapSchema.parse(asymmetry)).toThrow(
      /incidence must agree/,
    );
  });
  test("admits generic relations only between present spaces with unique IDs", () => {
    const main = {
      id: "main",
      baseId: "main",
      name: "",
      scope: "shared",
      layout: "generic",
      fields: {},
      spaces: { a: { id: "a", fields: {} }, b: { id: "b", fields: {} } },
      relations: [
        {
          id: "route",
          typeId: "route",
          fromSpaceId: "a",
          toSpaceId: "b",
          directed: false,
          fields: {},
        },
      ],
    };
    expect(BoardTopologyMapSchema.parse({ main })).toEqual({ main });
    expect(() =>
      BoardTopologyMapSchema.parse({
        main: {
          ...main,
          relations: [{ ...main.relations[0], toSpaceId: "absent" }],
        },
      }),
    ).toThrow(/Relation endpoints/);
    expect(() =>
      BoardTopologyMapSchema.parse({
        main: { ...main, relations: [...main.relations, ...main.relations] },
      }),
    ).toThrow(/Relation identities/);
  });
  test("requires replication-origin identity only for per-player boards", () => {
    const shared = projection().main;
    expect(() =>
      BoardTopologyMapSchema.parse({ main: { ...shared, playerId: "alice" } }),
    ).toThrow(/Shared board/);
    expect(() =>
      BoardTopologyMapSchema.parse({ main: { ...shared, baseId: "other" } }),
    ).toThrow(/Shared board identity/);
    const id = perPlayerInstanceId("board", "main", "alice");
    expect(() =>
      BoardTopologyMapSchema.parse({
        [id]: { ...shared, id, scope: "perPlayer", playerId: "bob" },
      }),
    ).toThrow(/Per-player board identity/);
    expect(
      BoardTopologyMapSchema.parse({
        [id]: { ...shared, id, scope: "perPlayer", playerId: "alice" },
      })[id].playerId,
    ).toBe("alice");
  });
  test("rejects out of domain coordinates and persisted authority additions", () => {
    const value = projection();
    value.main.spaces[tileSpaceId('tile:"/one', "cell")].q =
      MAXIMUM_BOARD_COORDINATE + 1;
    expect(() => BoardTopologyMapSchema.parse(value)).toThrow();
    expect(() =>
      BoardTopologyMapSchema.parse({
        main: { ...projection().main, placements: {} },
      }),
    ).toThrow(/Unrecognized key/);
  });
});
