import { describe, expect, test } from "bun:test";
import { createStateQueries, createTableQueries } from "../reducer";
import type { RuntimeTableRecord } from "../reducer";
import { perPlayer, type PlayerId } from "./per-player";
import {
  getComponentsOnEdge,
  getHexBoard,
  getEdge,
  getHexSpace,
  getHexSpaceAt,
  getVertex,
  getAdjacentSpaces,
  getBoard,
  getBoardsByTypeId,
  getCard,
  getCardOwner,
  getCardVisibility,
  getSlotOccupants,
  getSlotOccupantsByHost,
  getComponentContainerLocation,
  getComponentDeckLocation,
  getComponentEdgeLocation,
  getComponentHandLocation,
  getComponentLocation,
  getComponentSlotLocation,
  getComponentSpaceLocation,
  getComponentVertexLocation,
  getComponentZoneLocation,
  getComponentsOnVertex,
  getContainer,
  getIncidentEdges,
  getIncidentVertices,
  getPlayerOrder,
  getPlayerResources,
  getPlayerZoneCards,
  getSharedZoneCards,
  getSpace,
  getSpaceDistance,
  getSpaceEdges,
  getSpaceVertices,
  getComponentsInContainer,
  getComponentsOnSpace,
  getRelatedSpaces,
  getSquareBoard,
  getSquareDistance,
  getSquareNeighbors,
  getSquareSpace,
  getSquareSpaceAt,
  getTiledBoard,
  getSpacesByTypeId,
  addCardToSharedZone,
  moveCardBetweenPlayerZones,
  moveCardBetweenSharedZones,
  moveCardFromPlayerZoneToSharedZone,
  moveCardFromSharedZoneToPlayerZone,
  moveComponentToContainer,
  moveComponentToDetached,
  moveComponentToEdge,
  moveComponentToSpace,
  moveComponentToVertex,
} from "./table-ops";

function createSpatialTable(): RuntimeTableRecord {
  return {
    playerOrder: ["player-1", "player-2"],
    zones: {
      shared: {
        "draw-deck": ["card-1"],
        "special-deck": [],
        supply: ["piece-1", "die-1"],
      },
      perPlayer: {},
      visibility: {
        "draw-deck": "public",
        "special-deck": "public",
        supply: "public",
      },
      cardSetIdsByZoneId: {
        "draw-deck": ["main"],
        "special-deck": ["special"],
      },
    },
    decks: {
      "draw-deck": ["card-1"],
      "special-deck": [],
      supply: ["piece-1", "die-1"],
    },
    hands: {},
    handVisibility: {},
    cards: {
      "card-1": {
        id: "card-1",
        cardSetId: "main",
        cardType: "card",
        properties: {},
      },
    },
    pieces: {
      "piece-1": {
        id: "piece-1",
        pieceTypeId: "token",
        properties: {},
      },
    },
    componentLocations: {
      "card-1": {
        type: "InDeck",
        deckId: "draw-deck",
        playedBy: null,
        position: 0,
      },
      "piece-1": {
        type: "InZone",
        zoneId: "supply",
        playedBy: null,
        position: 0,
      },
      "die-1": {
        type: "InZone",
        zoneId: "supply",
        playedBy: null,
        position: 1,
      },
    },
    ownerOfCard: {
      "card-1": null,
    },
    visibility: {
      "card-1": { faceUp: true },
    },
    resources: perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? { coins: 2 } : { coins: 5 }),
    ),
    boards: {
      byId: {
        "main-board": {
          id: "main-board",
          baseId: "main-board",
          layout: "generic",
          typeId: "track",
          scope: "shared",
          fields: {},
          spaces: {
            "space-a": {
              id: "space-a",
              typeId: "slot",
              fields: {},
              zoneId: "main-board::space::space-a",
            },
            "space-b": {
              id: "space-b",
              typeId: "slot",
              fields: {},
              zoneId: "main-board::space::space-b",
            },
          },
          relations: [
            {
              typeId: "adjacent",
              fromSpaceId: "space-a",
              toSpaceId: "space-b",
              directed: false,
              fields: {},
            },
          ],
          containers: {
            "market-row": {
              id: "market-row",
              name: "Market Row",
              host: { type: "board" },
              allowedCardSetIds: ["main"],
              zoneId: "main-board::container::market-row",
              fields: {},
            },
            "restricted-row": {
              id: "restricted-row",
              name: "Restricted Row",
              host: { type: "board" },
              allowedCardSetIds: ["special"],
              zoneId: "main-board::container::restricted-row",
              fields: {},
            },
          },
        },
        "hex-board": {
          id: "hex-board",
          baseId: "hex-board",
          layout: "hex",
          typeId: "map",
          scope: "shared",
          orientation: "pointy-top",
          fields: {},
          spaces: {
            "tile-a": {
              id: "tile-a",
              q: 0,
              r: 0,
              typeId: "forest",
              fields: {},
            },
            "tile-b": {
              id: "tile-b",
              q: 1,
              r: 0,
              typeId: "desert",
              fields: {},
            },
          },
          relations: [
            {
              id: "tile-a$$tile-b",
              typeId: "adjacent",
              fromSpaceId: "tile-a",
              toSpaceId: "tile-b",
              directed: false,
              fields: {},
            },
          ],
          containers: {},
          edges: [
            {
              id: "tile-a$$tile-b",
              spaceIds: ["tile-a", "tile-b"],
              typeId: null,
              label: null,
              ownerId: null,
              fields: {},
            },
          ],
          vertices: [
            {
              id: "tile-a$$tile-a$$tile-b",
              spaceIds: ["tile-a", "tile-a", "tile-b"],
              typeId: null,
              label: null,
              fields: {},
            },
          ],
        },
        "square-board": {
          id: "square-board",
          baseId: "square-board",
          layout: "square",
          typeId: "grid",
          scope: "shared",
          fields: {},
          spaces: {
            "cell-a1": {
              id: "cell-a1",
              row: 0,
              col: 0,
              typeId: "start",
              fields: {},
            },
            "cell-a2": {
              id: "cell-a2",
              row: 0,
              col: 1,
              typeId: "path",
              fields: {},
            },
            "cell-b1": {
              id: "cell-b1",
              row: 1,
              col: 0,
              typeId: "path",
              fields: {},
            },
            "cell-b2": {
              id: "cell-b2",
              row: 1,
              col: 1,
              typeId: "goal",
              fields: {},
            },
          },
          relations: [
            {
              id: "square-edge:a1-a2",
              typeId: "adjacent",
              fromSpaceId: "cell-a1",
              toSpaceId: "cell-a2",
              directed: false,
              fields: {},
            },
            {
              id: "square-edge:a1-b1",
              typeId: "adjacent",
              fromSpaceId: "cell-a1",
              toSpaceId: "cell-b1",
              directed: false,
              fields: {},
            },
            {
              id: "square-edge:a2-b2",
              typeId: "adjacent",
              fromSpaceId: "cell-a2",
              toSpaceId: "cell-b2",
              directed: false,
              fields: {},
            },
            {
              id: "square-edge:b1-b2",
              typeId: "adjacent",
              fromSpaceId: "cell-b1",
              toSpaceId: "cell-b2",
              directed: false,
              fields: {},
            },
          ],
          containers: {
            "cell-storage": {
              id: "cell-storage",
              name: "Cell Storage",
              host: { type: "board" },
              zoneId: "square-board::container::cell-storage",
              fields: {},
            },
          },
          edges: [
            {
              id: "square-edge:a1-a2",
              spaceIds: ["cell-a1", "cell-a2"],
              typeId: "road-slot",
              label: null,
              ownerId: null,
              fields: {},
            },
            {
              id: "square-edge:a1-b1",
              spaceIds: ["cell-a1", "cell-b1"],
              typeId: null,
              label: null,
              ownerId: null,
              fields: {},
            },
          ],
          vertices: [
            {
              id: "square-vertex:center",
              spaceIds: ["cell-a1", "cell-a2", "cell-b1", "cell-b2"],
              typeId: "corner",
              label: null,
              ownerId: null,
              fields: {},
            },
          ],
        },
      },
      hex: {},
      square: {},
      network: {},
      track: {},
    },
    dice: {
      "die-1": {
        id: "die-1",
        dieTypeId: "d6",
        sides: 6,
        properties: {},
      },
    },
  };
}

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

  test("card moves respect allowedCardSetIds for shared zones and board containers", () => {
    const table = createSpatialTable();

    expect(() =>
      moveCardBetweenSharedZones({
        table,
        fromZoneId: "draw-deck",
        toZoneId: "special-deck",
        cardId: "card-1",
      }),
    ).toThrow("cannot enter zone 'special-deck'");

    expect(() =>
      moveComponentToContainer(table, "card-1", "main-board", "restricted-row"),
    ).toThrow("cannot enter container 'restricted-row'");
  });

  test("moveComponentToSpace and moveComponentToContainer re-home cards, pieces, and dice", () => {
    const table = createSpatialTable();

    const withCardInContainer = moveComponentToContainer(
      table,
      "card-1",
      "main-board",
      "market-row",
    );
    const withPieceOnSpace = moveComponentToSpace(
      withCardInContainer,
      "piece-1",
      "main-board",
      "space-a",
    );
    const withDieOnSpace = moveComponentToSpace(
      withPieceOnSpace,
      "die-1",
      "main-board",
      "space-a",
    );

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
    const withPieceOnSpace = moveComponentToSpace(
      table,
      "piece-1",
      "main-board",
      "space-a",
    );
    const withDieOnSpace = moveComponentToSpace(
      withPieceOnSpace,
      "die-1",
      "main-board",
      "space-a",
    );

    const detached = moveComponentToDetached(withDieOnSpace, "piece-1");

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
      moveComponentToEdge(
        table,
        "piece-1",
        "square-board",
        "missing-edge" as never,
      ),
    ).toThrow("Unknown edge");
    expect(() =>
      moveComponentToVertex(
        table,
        "piece-1",
        "square-board",
        "missing-vertex" as never,
      ),
    ).toThrow("Unknown vertex");

    const withPieceOnEdge = moveComponentToEdge(
      table,
      "piece-1",
      "square-board",
      "square-edge:a1-a2",
    );
    const withDieOnEdge = moveComponentToEdge(
      withPieceOnEdge,
      "die-1",
      "square-board",
      "square-edge:a1-a2",
    );
    const withPieceOnVertex = moveComponentToVertex(
      withDieOnEdge,
      "piece-1",
      "square-board",
      "square-vertex:center",
    );

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

    const moved = moveComponentToSpace(
      table,
      "piece-1",
      "main-board",
      "space-a",
    );

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

  test("raw read helpers expose cards, players, and resolved component locations", () => {
    const table = createSpatialTable();
    table.cards["card-2"] = {
      id: "card-2",
      cardSetId: "main",
      cardType: "card",
      name: "Spare Card",
      properties: {},
    };
    table.ownerOfCard["card-2"] = "player-1";
    table.visibility["card-2"] = {
      faceUp: false,
      visibleTo: ["player-1"],
    };
    table.hands["player-hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-2"] : []),
    );
    table.zones.perPlayer["player-hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-2"] : []),
    );
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
    table.pieces["piece-4"] = {
      id: "piece-4",
      pieceTypeId: "token",
      properties: {},
    };
    table.pieces["piece-5"] = {
      id: "piece-5",
      pieceTypeId: "token",
      properties: {},
    };
    table.pieces["piece-6"] = {
      id: "piece-6",
      pieceTypeId: "token",
      ownerId: "player-2",
      properties: { strength: 2 },
    };
    table.pieces["piece-7"] = {
      id: "piece-7",
      pieceTypeId: "token",
      properties: {},
    };
    table.componentLocations["card-2"] = {
      type: "InHand",
      handId: "player-hand",
      playerId: "player-1",
      position: 0,
    };
    table.componentLocations["piece-2"] = {
      type: "OnSpace",
      boardId: "main-board",
      spaceId: "space-a",
      position: 0,
    };
    table.componentLocations["piece-3"] = {
      type: "InContainer",
      boardId: "main-board",
      containerId: "market-row",
      position: 0,
    };
    table.componentLocations["piece-4"] = {
      type: "OnEdge",
      boardId: "square-board",
      edgeId: "square-edge:a1-a2",
      position: 0,
    };
    table.componentLocations["piece-5"] = {
      type: "OnVertex",
      boardId: "square-board",
      vertexId: "square-vertex:center",
      position: 0,
    };
    table.componentLocations["piece-6"] = {
      type: "InSlot",
      host: { kind: "piece", id: "host-a" },
      slotId: "worker-rest",
      position: 0,
    };
    table.componentLocations["piece-7"] = { type: "Detached" };

    expect(getCard(table, "card-2").name).toBe("Spare Card");
    expect(getCardOwner(table, "card-2")).toBe("player-1");
    expect(getCardVisibility(table, "card-2")).toEqual({
      faceUp: false,
      visibleTo: ["player-1"],
    });
    expect(getPlayerOrder(table)).toEqual(["player-1", "player-2"]);
    expect(getPlayerResources(table, "player-1")).toEqual({ coins: 2 });
    expect(getComponentLocation(table, "piece-7")).toEqual({
      type: "Detached",
    });
    expect(getComponentDeckLocation(table, "card-1")).toEqual({
      componentId: "card-1",
      deckId: "draw-deck",
      cards: ["card-1"],
      location: {
        type: "InDeck",
        deckId: "draw-deck",
        playedBy: null,
        position: 0,
      },
    });
    expect(getComponentHandLocation(table, "card-2")).toEqual({
      componentId: "card-2",
      handId: "player-hand",
      playerId: "player-1",
      cards: ["card-2"],
      location: {
        type: "InHand",
        handId: "player-hand",
        playerId: "player-1",
        position: 0,
      },
    });
    expect(getComponentZoneLocation(table, "piece-1")).toEqual({
      componentId: "piece-1",
      zoneId: "supply",
      location: {
        type: "InZone",
        zoneId: "supply",
        playedBy: null,
        position: 0,
      },
    });
    expect(getComponentSpaceLocation(table, "piece-2")).toMatchObject({
      componentId: "piece-2",
      boardId: "main-board",
      spaceId: "space-a",
      location: {
        type: "OnSpace",
        boardId: "main-board",
        spaceId: "space-a",
        position: 0,
      },
    });
    expect(getComponentContainerLocation(table, "piece-3")).toMatchObject({
      componentId: "piece-3",
      boardId: "main-board",
      containerId: "market-row",
      location: {
        type: "InContainer",
        boardId: "main-board",
        containerId: "market-row",
        position: 0,
      },
    });
    expect(getComponentEdgeLocation(table, "piece-4")).toMatchObject({
      componentId: "piece-4",
      boardId: "square-board",
      edgeId: "square-edge:a1-a2",
      location: {
        type: "OnEdge",
        boardId: "square-board",
        edgeId: "square-edge:a1-a2",
        position: 0,
      },
    });
    expect(getComponentVertexLocation(table, "piece-5")).toMatchObject({
      componentId: "piece-5",
      boardId: "square-board",
      vertexId: "square-vertex:center",
      location: {
        type: "OnVertex",
        boardId: "square-board",
        vertexId: "square-vertex:center",
        position: 0,
      },
    });
    expect(getComponentSlotLocation(table, "piece-6")).toEqual({
      componentId: "piece-6",
      host: { kind: "piece", id: "host-a" },
      slotId: "worker-rest",
      location: {
        type: "InSlot",
        host: { kind: "piece", id: "host-a" },
        slotId: "worker-rest",
        position: 0,
      },
    });
    expect(
      getSlotOccupants(table, { kind: "piece", id: "host-a" }, "worker-rest"),
    ).toEqual([
      {
        pieceId: "piece-6",
        playerId: "player-2",
        slotId: "worker-rest",
        data: { strength: 2 },
      },
    ]);
    expect(
      getSlotOccupantsByHost(table, { kind: "piece", id: "host-a" }),
    ).toEqual({
      "worker-rest": [
        {
          pieceId: "piece-6",
          playerId: "player-2",
          slotId: "worker-rest",
          data: { strength: 2 },
        },
      ],
    });
    expect(getComponentSpaceLocation(table, "piece-7")).toBeNull();
    expect(getComponentContainerLocation(table, "piece-7")).toBeNull();
    expect(getComponentEdgeLocation(table, "piece-7")).toBeNull();
    expect(getComponentVertexLocation(table, "piece-7")).toBeNull();
    expect(getComponentSlotLocation(table, "piece-7")).toBeNull();
  });

  test("table query facade matches the existing read helpers", () => {
    const table = createSpatialTable();
    table.cards["card-2"] = {
      id: "card-2",
      cardSetId: "main",
      cardType: "card",
      name: "Second Card",
      properties: {},
    };
    table.ownerOfCard["card-2"] = "player-2";
    table.visibility["card-2"] = { faceUp: true };
    table.hands["player-hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-2"] : []),
    );
    table.zones.perPlayer["player-hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-2"] : []),
    );
    table.componentLocations["card-2"] = {
      type: "InHand",
      handId: "player-hand",
      playerId: "player-1",
      position: 0,
    };
    table.pieces["piece-8"] = {
      id: "piece-8",
      pieceTypeId: "token",
      ownerId: "player-1",
      properties: { stamina: 1 },
    };
    table.componentLocations["piece-8"] = {
      type: "InSlot",
      host: { kind: "piece", id: "host-a" },
      slotId: "worker-rest",
      position: 0,
    };

    const q = createTableQueries(table);

    expect(q.board.get("main-board")).toBe(getBoard(table, "main-board"));
    expect(q.board.hex("hex-board")).toBe(getHexBoard(table, "hex-board"));
    expect(q.board.square("square-board")).toBe(
      getSquareBoard(table, "square-board"),
    );
    expect(q.board.space("main-board", "space-a")).toBe(
      getSpace(table, "main-board", "space-a"),
    );
    expect(q.board.container("main-board", "market-row")).toBe(
      getContainer(table, "main-board", "market-row"),
    );
    expect(q.board.edge("hex-board", "tile-a$$tile-b")).toBe(
      getEdge(table, "hex-board", "tile-a$$tile-b"),
    );
    expect(q.board.vertex("hex-board", "tile-a$$tile-a$$tile-b")).toBe(
      getVertex(table, "hex-board", "tile-a$$tile-a$$tile-b"),
    );
    expect(q.board.byType("track")).toEqual(getBoardsByTypeId(table, "track"));
    expect(q.board.adjacentSpaces("main-board", "space-a")).toEqual(
      getAdjacentSpaces(table, "main-board", "space-a"),
    );
    expect(
      q.board.incidentEdges("square-board", "square-vertex:center"),
    ).toEqual(getIncidentEdges(table, "square-board", "square-vertex:center"));
    expect(q.board.spaceDistance("square-board", "cell-a1", "cell-b2")).toBe(
      getSpaceDistance(table, "square-board", "cell-a1", "cell-b2"),
    );
    expect(q.zone.sharedCards("draw-deck")).toEqual(
      getSharedZoneCards(table, "draw-deck"),
    );
    expect(q.zone.sharedCardCollection("draw-deck")).toEqual({
      cardIds: ["card-1"],
      cardsById: {
        "card-1": {
          id: "card-1",
          cardType: "card",
          properties: {},
        },
      },
    });
    expect(q.zone.playerCards("player-1", "player-hand")).toEqual(
      getPlayerZoneCards(table, "player-1", "player-hand"),
    );
    expect(q.zone.playerCardCollection("player-1", "player-hand")).toEqual({
      cardIds: ["card-2"],
      cardsById: {
        "card-2": {
          id: "card-2",
          cardType: "card",
          name: "Second Card",
          properties: {},
        },
      },
    });
    expect(q.card.get("card-2")).toEqual(getCard(table, "card-2"));
    expect(q.card.byIds(["card-1", "card-2"] as const)).toEqual({
      "card-1": {
        id: "card-1",
        cardType: "card",
        properties: {},
      },
      "card-2": {
        id: "card-2",
        cardType: "card",
        name: "Second Card",
        properties: {},
      },
    });
    expect(q.card.owner("card-2")).toBe(getCardOwner(table, "card-2"));
    expect(q.card.visibility("card-2")).toEqual(
      getCardVisibility(table, "card-2"),
    );
    expect(
      q.slot.occupants({ kind: "piece", id: "host-a" }, "worker-rest"),
    ).toEqual([
      {
        pieceId: "piece-8",
        playerId: "player-1",
        slotId: "worker-rest",
        data: { stamina: 1 },
      },
    ]);
    expect(q.slot.occupantsByHost({ kind: "piece", id: "host-a" })).toEqual({
      "worker-rest": [
        {
          pieceId: "piece-8",
          playerId: "player-1",
          slotId: "worker-rest",
          data: { stamina: 1 },
        },
      ],
    });
    expect(q.slot.pieceOccupants("host-a", "worker-rest")).toEqual(
      q.slot.occupants({ kind: "piece", id: "host-a" }, "worker-rest"),
    );
    expect(q.slot.pieceOccupantsByHost("host-a")).toEqual(
      q.slot.occupantsByHost({ kind: "piece", id: "host-a" }),
    );
    expect(q.slot.dieOccupants("host-a", "worker-rest")).toEqual([]);
    expect(q.player.order()).toEqual(getPlayerOrder(table));
    expect(q.player.resources("player-2")).toEqual(
      getPlayerResources(table, "player-2"),
    );
    expect(q.component.location("card-2")).toEqual(
      getComponentLocation(table, "card-2"),
    );
    expect(q.component.hand("card-2")).toEqual(
      getComponentHandLocation(table, "card-2"),
    );
  });

  test("state-bound table query facade preserves runtime reads", () => {
    const table = createSpatialTable();
    const state = {
      table,
      flow: { activePlayers: ["player-1"] },
    };

    const q = createStateQueries(state);

    expect(q.board.hex("hex-board")).toBe(getHexBoard(table, "hex-board"));
    expect(q.zone.sharedCards("draw-deck")).toEqual(
      getSharedZoneCards(table, "draw-deck"),
    );
    expect(q.player.order()).toEqual(getPlayerOrder(table));
  });

  test("moveCardFromPlayerZoneToSharedZone explains zone scope mismatches", () => {
    const table = createSpatialTable();

    expect(() =>
      moveCardFromPlayerZoneToSharedZone({
        table,
        playerId: "player-1" as any,
        fromZoneId: "draw-deck" as any,
        toZoneId: "special-deck" as any,
        cardId: "card-1" as any,
      }),
    ).toThrow(
      "Zone 'draw-deck' has scope 'shared', but moveCardFromPlayerZoneToSharedZone requires fromZoneId to be a perPlayer zone.",
    );

    table.hands["player-hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-1"] : []),
    );
    table.zones.perPlayer["player-hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-1"] : []),
    );

    expect(() =>
      moveCardFromPlayerZoneToSharedZone({
        table,
        playerId: "player-1" as any,
        fromZoneId: "player-hand" as any,
        toZoneId: "player-hand" as any,
        cardId: "card-1" as any,
      }),
    ).toThrow(
      "Zone 'player-hand' has scope 'perPlayer', but moveCardFromPlayerZoneToSharedZone requires toZoneId to be a shared zone.",
    );
  });

  test("addCardToSharedZone places card on top when position is 'top'", () => {
    const table = createSpatialTable();
    table.cards["card-2"] = {
      id: "card-2",
      cardSetId: "main",
      cardType: "card",
      properties: {},
    } as RuntimeTableRecord["cards"][string];
    table.componentLocations["card-2"] = {
      type: "Detached",
    };
    table.ownerOfCard["card-2"] = null;
    table.visibility["card-2"] = { faceUp: true };

    const next = addCardToSharedZone(
      table,
      "draw-deck" as any,
      "card-2" as any,
      null,
      "top",
    );

    expect(next.decks["draw-deck"]).toEqual(["card-2", "card-1"]);
    expect(next.zones.shared["draw-deck"]).toEqual(["card-2", "card-1"]);
    expect(next.componentLocations["card-2"]).toEqual({
      type: "InDeck",
      deckId: "draw-deck",
      playedBy: null,
      position: 0,
    });
    expect(next.componentLocations["card-1"]).toEqual({
      type: "InDeck",
      deckId: "draw-deck",
      playedBy: null,
      position: 1,
    });
  });

  test("addCardToSharedZone defaults to bottom placement", () => {
    const table = createSpatialTable();
    table.cards["card-2"] = {
      id: "card-2",
      cardSetId: "main",
      cardType: "card",
      properties: {},
    } as RuntimeTableRecord["cards"][string];
    table.componentLocations["card-2"] = { type: "Detached" };
    table.ownerOfCard["card-2"] = null;
    table.visibility["card-2"] = { faceUp: true };

    const next = addCardToSharedZone(
      table,
      "draw-deck" as any,
      "card-2" as any,
    );

    expect(next.decks["draw-deck"]).toEqual(["card-1", "card-2"]);
    expect(next.componentLocations["card-2"]).toMatchObject({
      type: "InDeck",
      position: 1,
    });
    expect(next.componentLocations["card-1"]).toMatchObject({
      type: "InDeck",
      position: 0,
    });
  });

  test("moveCardBetweenSharedZones honors position 'top'", () => {
    const table = createSpatialTable();
    // Seed special-deck with one card so the topdeck reindex is observable.
    table.cards["card-special"] = {
      id: "card-special",
      cardSetId: "special",
      cardType: "card",
      properties: {},
    } as RuntimeTableRecord["cards"][string];
    table.decks["special-deck"] = ["card-special"];
    table.zones.shared["special-deck"] = ["card-special"];
    table.componentLocations["card-special"] = {
      type: "InDeck",
      deckId: "special-deck",
      playedBy: null,
      position: 0,
    };
    table.ownerOfCard["card-special"] = null;
    table.visibility["card-special"] = { faceUp: true };
    // Make draw-deck and special-deck cardSet-compatible for this test.
    table.zones.cardSetIdsByZoneId!["special-deck"] = ["main", "special"];

    const next = moveCardBetweenSharedZones({
      table,
      fromZoneId: "draw-deck" as any,
      toZoneId: "special-deck" as any,
      cardId: "card-1" as any,
      position: "top",
    });

    expect(next.decks["special-deck"]).toEqual(["card-1", "card-special"]);
    expect(next.componentLocations["card-1"]).toMatchObject({
      type: "InDeck",
      deckId: "special-deck",
      position: 0,
    });
    expect(next.componentLocations["card-special"]).toMatchObject({
      type: "InDeck",
      deckId: "special-deck",
      position: 1,
    });
  });

  test("moveCardFromPlayerZoneToSharedZone honors position 'top'", () => {
    const table = createSpatialTable();
    table.handVisibility["player-hand"] = "ownerOnly";
    table.hands["player-hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-1"] : []),
    );
    table.zones.perPlayer["player-hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-1"] : []),
    );
    table.componentLocations["card-1"] = {
      type: "InHand",
      handId: "player-hand",
      playerId: "player-1",
      position: 0,
    };
    // Seed draw-deck with another card so 'top' placement is observable.
    table.cards["card-other"] = {
      id: "card-other",
      cardSetId: "main",
      cardType: "card",
      properties: {},
    } as RuntimeTableRecord["cards"][string];
    table.decks["draw-deck"] = ["card-other"];
    table.zones.shared["draw-deck"] = ["card-other"];
    table.componentLocations["card-other"] = {
      type: "InDeck",
      deckId: "draw-deck",
      playedBy: null,
      position: 0,
    };
    table.ownerOfCard["card-other"] = null;
    table.visibility["card-other"] = { faceUp: true };

    const next = moveCardFromPlayerZoneToSharedZone({
      table,
      playerId: "player-1" as any,
      fromZoneId: "player-hand" as any,
      toZoneId: "draw-deck" as any,
      cardId: "card-1" as any,
      position: "top",
    });

    expect(next.decks["draw-deck"]).toEqual(["card-1", "card-other"]);
    expect(next.componentLocations["card-1"]).toMatchObject({
      type: "InDeck",
      deckId: "draw-deck",
      position: 0,
    });
    expect(next.componentLocations["card-other"]).toMatchObject({
      type: "InDeck",
      deckId: "draw-deck",
      position: 1,
    });
  });

  test("moveCardBetweenPlayerZones preserves owner and recomputes visibility for ownerOnly destination", () => {
    const table = createSpatialTable();
    table.handVisibility["hand"] = "ownerOnly";
    table.handVisibility["in-play"] = "public";
    table.zones.cardSetIdsByZoneId!["hand"] = ["main"];
    table.zones.cardSetIdsByZoneId!["in-play"] = ["main"];
    table.hands["hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-1"] : []),
    );
    table.zones.perPlayer["hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-1"] : []),
    );
    table.hands["in-play"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["in-play"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );
    table.componentLocations["card-1"] = {
      type: "InHand",
      handId: "hand",
      playerId: "player-1",
      position: 0,
    };
    table.ownerOfCard["card-1"] = "player-1";
    table.visibility["card-1"] = { faceUp: false, visibleTo: ["player-1"] };

    const afterPlay = moveCardBetweenPlayerZones({
      table,
      playerId: "player-1" as any,
      fromZoneId: "hand" as any,
      toZoneId: "in-play" as any,
      cardId: "card-1" as any,
    });

    expect(afterPlay.componentLocations["card-1"]).toEqual({
      type: "InHand",
      handId: "in-play",
      playerId: "player-1",
      position: 0,
    });
    expect(afterPlay.ownerOfCard["card-1"]).toBe("player-1");
    expect(afterPlay.visibility["card-1"]).toEqual({ faceUp: true });

    // Source hand was emptied for player-1, untouched for player-2.
    expect(
      perPlayer(
        ["player-1"].map((id) => id as PlayerId),
        () => [],
      ),
    ).toBeDefined();

    // hand → discard recomputes visibility back to faceUp:false for ownerOnly.
    table.handVisibility["discard"] = "ownerOnly";
    table.zones.cardSetIdsByZoneId!["discard"] = ["main"];
    afterPlay.hands["discard"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );
    afterPlay.zones.perPlayer["discard"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );

    const afterCleanup = moveCardBetweenPlayerZones({
      table: afterPlay,
      playerId: "player-1" as any,
      fromZoneId: "in-play" as any,
      toZoneId: "discard" as any,
      cardId: "card-1" as any,
    });

    expect(afterCleanup.visibility["card-1"]).toEqual({
      faceUp: false,
      visibleTo: ["player-1"],
    });
    expect(afterCleanup.ownerOfCard["card-1"]).toBe("player-1");
  });

  test("moveCardBetweenPlayerZones rejects when card is not in the source zone", () => {
    const table = createSpatialTable();
    table.handVisibility["hand"] = "ownerOnly";
    table.handVisibility["in-play"] = "public";
    table.hands["hand"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["hand"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.hands["in-play"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["in-play"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );

    expect(() =>
      moveCardBetweenPlayerZones({
        table,
        playerId: "player-1" as any,
        fromZoneId: "hand" as any,
        toZoneId: "in-play" as any,
        cardId: "card-1" as any,
      }),
    ).toThrow("Card 'card-1' is not in zone 'hand' for player 'player-1'.");
  });

  test("moveCardBetweenPlayerZones rejects when scopes do not match", () => {
    const table = createSpatialTable();

    expect(() =>
      moveCardBetweenPlayerZones({
        table,
        playerId: "player-1" as any,
        fromZoneId: "draw-deck" as any,
        toZoneId: "draw-deck" as any,
        cardId: "card-1" as any,
      }),
    ).toThrow(
      "Zone 'draw-deck' has scope 'shared', but moveCardBetweenPlayerZones requires fromZoneId to be a perPlayer zone.",
    );
  });

  test("moveCardBetweenPlayerZones rejects on cardSet mismatch", () => {
    const table = createSpatialTable();
    table.handVisibility["hand"] = "ownerOnly";
    table.handVisibility["only-special"] = "public";
    table.zones.cardSetIdsByZoneId!["hand"] = ["main"];
    table.zones.cardSetIdsByZoneId!["only-special"] = ["special"];
    table.hands["hand"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => ["card-1"],
    );
    table.zones.perPlayer["hand"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => ["card-1"],
    );
    table.hands["only-special"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["only-special"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.componentLocations["card-1"] = {
      type: "InHand",
      handId: "hand",
      playerId: "player-1",
      position: 0,
    };

    expect(() =>
      moveCardBetweenPlayerZones({
        table,
        playerId: "player-1" as any,
        fromZoneId: "hand" as any,
        toZoneId: "only-special" as any,
        cardId: "card-1" as any,
      }),
    ).toThrow("cannot enter zone 'only-special'");
  });

  test("moveCardFromSharedZoneToPlayerZone gains a named card to ownerOnly discard", () => {
    const table = createSpatialTable();
    table.handVisibility["discard"] = "ownerOnly";
    table.zones.cardSetIdsByZoneId!["discard"] = ["main"];
    table.hands["discard"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["discard"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );

    const next = moveCardFromSharedZoneToPlayerZone({
      table,
      playerId: "player-1" as any,
      fromZoneId: "draw-deck" as any,
      toZoneId: "discard" as any,
      cardId: "card-1" as any,
    });

    expect(next.decks["draw-deck"]).toEqual([]);
    expect(next.zones.shared["draw-deck"]).toEqual([]);
    expect(next.componentLocations["card-1"]).toEqual({
      type: "InHand",
      handId: "discard",
      playerId: "player-1",
      position: 0,
    });
    expect(next.ownerOfCard["card-1"]).toBe("player-1");
    expect(next.visibility["card-1"]).toEqual({
      faceUp: false,
      visibleTo: ["player-1"],
    });
  });

  test("moveCardFromSharedZoneToPlayerZone keeps faceUp:true for public destination", () => {
    const table = createSpatialTable();
    table.handVisibility["public-area"] = "public";
    table.zones.cardSetIdsByZoneId!["public-area"] = ["main"];
    table.hands["public-area"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["public-area"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );

    const next = moveCardFromSharedZoneToPlayerZone({
      table,
      playerId: "player-1" as any,
      fromZoneId: "draw-deck" as any,
      toZoneId: "public-area" as any,
      cardId: "card-1" as any,
    });

    expect(next.visibility["card-1"]).toEqual({ faceUp: true });
    expect(next.ownerOfCard["card-1"]).toBe("player-1");
  });

  test("moveCardFromSharedZoneToPlayerZone rejects on cardSet mismatch", () => {
    const table = createSpatialTable();
    table.handVisibility["only-special-hand"] = "ownerOnly";
    table.zones.cardSetIdsByZoneId!["only-special-hand"] = ["special"];
    table.hands["only-special-hand"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["only-special-hand"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );

    expect(() =>
      moveCardFromSharedZoneToPlayerZone({
        table,
        playerId: "player-1" as any,
        fromZoneId: "draw-deck" as any,
        toZoneId: "only-special-hand" as any,
        cardId: "card-1" as any,
      }),
    ).toThrow("cannot enter zone 'only-special-hand'");
  });

  test("moveCardFromSharedZoneToPlayerZone rejects when card is not in source zone", () => {
    const table = createSpatialTable();
    table.handVisibility["discard"] = "ownerOnly";
    table.hands["discard"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["discard"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );

    expect(() =>
      moveCardFromSharedZoneToPlayerZone({
        table,
        playerId: "player-1" as any,
        fromZoneId: "special-deck" as any,
        toZoneId: "discard" as any,
        cardId: "card-1" as any,
      }),
    ).toThrow("Card 'card-1' is not in shared zone 'special-deck'.");
  });
});
