import { describe, expect, test } from "vitest";
import { createStateQueries, createTableQueries } from "../../reducer";
import { asPlayerId } from "../per-player";
import type { ZoneDefinitions } from "../model";
import {
  getAdjacentSpaces,
  getBoard,
  getCard,
  getCardOwner,
  getCardVisibility,
  getComponentEdgeLocation,
  getComponentLocation,
  getComponentSpaceLocation,
  getComponentVertexLocation,
  getComponentZoneLocation,
  getEdge,
  getHexBoard,
  getIncidentEdges,
  getZoneComponents,
  getPlayerOrder,
  getPlayerResources,
  getSpace,
  getSpaceDistance,
  getSquareBoard,
  getVertex,
} from "./index";
import {
  createSpatialTable,
  spatialDefinitions,
  spatialElements,
  spatialIds,
} from "./table-test-fixtures";
const definitions = {
  ...spatialDefinitions,
  zoneDefinitions: {
    ...spatialDefinitions.zoneDefinitions,
    "worker-rest": {
      attachedTo: { pieceType: "token" },
      visibility: "public",
      allowedCardSetIds: [],
    },
    "draw-deck": {
      scope: "shared",
      visibility: "public",
      allowedCardSetIds: ["main"],
    },
    "special-deck": {
      scope: "shared",
      visibility: "public",
      allowedCardSetIds: ["special"],
    },
    supply: { scope: "shared", visibility: "public", allowedCardSetIds: [] },
    "player-hand": {
      scope: "perPlayer",
      visibility: "ownerOnly",
      allowedCardSetIds: ["main"],
    },
  },
} satisfies ZoneDefinitions;

describe("table ops spatial helpers", () => {
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
    table.zones["player-hand"] = Object.fromEntries(
      ["player-1", "player-2"]
        .map(asPlayerId)
        .map((id) => [id, id === asPlayerId("player-1") ? ["card-2"] : []]),
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
      type: "InZone",
      zoneId: "player-hand",
      hostId: "player-1",
      playedBy: null,
    };
    table.componentLocations["piece-2"] = {
      type: "OnSpace",
      boardId: "main-board",
      spaceId: "space-a",
      position: 0,
    };
    table.componentLocations["piece-3"] = {
      type: "InZone",
      zoneId: "market-row",
      hostId: "main-board",
      playedBy: null,
    };
    table.componentLocations["piece-4"] = {
      type: "OnEdge",
      boardId: "square-board",
      edgeId: spatialElements().squareEdge,
      position: 0,
    };
    table.componentLocations["piece-5"] = {
      type: "OnVertex",
      boardId: "square-board",
      vertexId: spatialElements().squareVertex,
      position: 0,
    };
    table.componentLocations["piece-6"] = {
      type: "InZone",
      zoneId: "worker-rest",
      hostId: "host-a",
      playedBy: null,
    };
    table.componentLocations["piece-7"] = { type: "Detached" };
    table.pieces["host-a"] = {
      id: "host-a",
      pieceTypeId: "token",
      properties: {},
    };
    table.componentLocations["host-a"] = { type: "Detached" };
    table.zones["worker-rest"] = Object.fromEntries(
      Object.keys(table.pieces).map((id) => [
        id,
        id === "host-a" ? ["piece-6"] : [],
      ]),
    );
    table.zones["market-row"]["main-board"] = ["piece-3"];

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
    expect(getComponentZoneLocation(table, "card-1")).toEqual({
      componentId: "card-1",
      zoneId: "draw-deck",
      hostId: "table",
      location: {
        type: "InZone",
        zoneId: "draw-deck",
        hostId: "table",
        playedBy: null,
      },
    });
    expect(getComponentZoneLocation(table, "card-2")).toEqual({
      componentId: "card-2",
      zoneId: "player-hand",
      hostId: "player-1",
      location: {
        type: "InZone",
        zoneId: "player-hand",
        hostId: "player-1",
        playedBy: null,
      },
    });
    expect(
      getZoneComponents(table, definitions, { zoneId: "draw-deck" }),
    ).toEqual(["card-1"]);
    expect(
      getZoneComponents(table, definitions, {
        zoneId: "player-hand",
        hostId: "player-1",
      }),
    ).toEqual(["card-2"]);
    expect(getComponentZoneLocation(table, "piece-1")).toEqual({
      componentId: "piece-1",
      zoneId: "supply",
      hostId: "table",
      location: {
        type: "InZone",
        zoneId: "supply",
        hostId: "table",
        playedBy: null,
      },
    });
    expect(
      getComponentSpaceLocation(table, definitions, "piece-2"),
    ).toMatchObject({
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
    expect(getComponentZoneLocation(table, "piece-3")).toEqual({
      componentId: "piece-3",
      zoneId: "market-row",
      hostId: "main-board",
      location: table.componentLocations["piece-3"],
    });
    expect(
      getComponentEdgeLocation(table, definitions, "piece-4"),
    ).toMatchObject({
      componentId: "piece-4",
      boardId: "square-board",
      edgeId: spatialElements().squareEdge,
      location: {
        type: "OnEdge",
        boardId: "square-board",
        edgeId: spatialElements().squareEdge,
        position: 0,
      },
    });
    expect(
      getComponentVertexLocation(table, definitions, "piece-5"),
    ).toMatchObject({
      componentId: "piece-5",
      boardId: "square-board",
      vertexId: spatialElements().squareVertex,
      location: {
        type: "OnVertex",
        boardId: "square-board",
        vertexId: spatialElements().squareVertex,
        position: 0,
      },
    });
    expect(getComponentZoneLocation(table, "piece-6")).toEqual({
      componentId: "piece-6",
      zoneId: "worker-rest",
      hostId: "host-a",
      location: table.componentLocations["piece-6"],
    });
    expect(
      getZoneComponents(table, definitions, {
        zoneId: "worker-rest",
        hostId: "host-a",
      }),
    ).toEqual(["piece-6"]);
    expect(table.pieces["piece-6"].ownerId).toBe("player-2");
    expect(table.pieces["piece-6"].properties).toEqual({ strength: 2 });
    expect(getComponentSpaceLocation(table, definitions, "piece-7")).toBeNull();
    expect(getComponentEdgeLocation(table, definitions, "piece-7")).toBeNull();
    expect(
      getComponentVertexLocation(table, definitions, "piece-7"),
    ).toBeNull();
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
    table.zones["player-hand"] = Object.fromEntries(
      ["player-1", "player-2"]
        .map(asPlayerId)
        .map((id) => [id, id === asPlayerId("player-1") ? ["card-2"] : []]),
    );
    table.componentLocations["card-2"] = {
      type: "InZone",
      zoneId: "player-hand",
      hostId: "player-1",
      playedBy: null,
    };
    table.pieces["piece-8"] = {
      id: "piece-8",
      pieceTypeId: "token",
      ownerId: "player-1",
      properties: { stamina: 1 },
    };
    table.componentLocations["piece-8"] = {
      type: "InZone",
      zoneId: "worker-rest",
      hostId: "host-a",
      playedBy: null,
    };

    table.pieces["host-a"] = {
      id: "host-a",
      pieceTypeId: "token",
      properties: {},
    };
    table.componentLocations["host-a"] = { type: "Detached" };
    table.zones["worker-rest"] = Object.fromEntries(
      Object.keys(table.pieces).map((id) => [
        id,
        id === "host-a" ? ["piece-8"] : [],
      ]),
    );
    const q = createTableQueries(table, definitions);

    expect(q.board("main-board").state).toBe(
      getBoard(table, definitions, "main-board"),
    );
    expect(q.board("hex-board").state).toBe(
      getHexBoard(table, definitions, "hex-board"),
    );
    expect(q.board("square-board").state).toBe(
      getSquareBoard(table, definitions, "square-board"),
    );
    expect(q.board("main-board").space("space-a")).toBe(
      getSpace(table, definitions, "main-board", "space-a"),
    );
    expect(q.zone("market-row", "main-board")).toEqual([]);
    expect(
      q
        .board("hex-board")
        .state.edges.find((edge) => edge.id === spatialElements().hexEdge),
    ).toBe(getEdge(table, definitions, "hex-board", spatialElements().hexEdge));
    expect(
      q
        .board("hex-board")
        .state.vertices.find(
          (vertex) => vertex.id === spatialElements().hexVertex,
        ),
    ).toBe(
      getVertex(table, definitions, "hex-board", spatialElements().hexVertex),
    );
    expect(q.board("main-board").neighbors("space-a")).toEqual(
      getAdjacentSpaces(table, definitions, "main-board", "space-a"),
    );
    expect(
      q.board("square-board").edgesOf(spatialElements().squareVertex),
    ).toEqual(
      getIncidentEdges(
        table,
        definitions,
        "square-board",
        spatialElements().squareVertex,
      ),
    );
    expect(
      q
        .board("square-board")
        .distance(spatialIds.squareA1, spatialIds.squareB2),
    ).toBe(
      getSpaceDistance(
        table,
        definitions,
        "square-board",
        spatialIds.squareA1,
        spatialIds.squareB2,
      ),
    );
    expect(q.zone("draw-deck")).toEqual(
      getZoneComponents(table, definitions, { zoneId: "draw-deck" }),
    );
    expect(q.zone.cards("draw-deck")).toEqual({
      cardIds: ["card-1"],
      cardsById: {
        "card-1": {
          id: "card-1",
          cardType: "card",
          name: "Card",
          frontImage: undefined,
          backImage: undefined,
          text: undefined,
          properties: {},
        },
      },
    });
    expect(q.zone("player-hand", "player-1")).toEqual(
      getZoneComponents(table, definitions, {
        zoneId: "player-hand",
        hostId: "player-1",
      }),
    );
    expect(q.zone.cards("player-hand", "player-1")).toEqual({
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
        name: "Card",
        frontImage: undefined,
        backImage: undefined,
        text: undefined,
        properties: {},
      },
      "card-2": {
        id: "card-2",
        cardType: "card",
        name: "Second Card",
        frontImage: undefined,
        backImage: undefined,
        text: undefined,
        properties: {},
      },
    });
    expect(q.card.owner("card-2")).toBe(getCardOwner(table, "card-2"));
    expect(q.card.visibility("card-2")).toEqual(
      getCardVisibility(table, "card-2"),
    );
    expect(q.zone("worker-rest", "host-a")).toEqual(["piece-8"]);
    expect(q.zones("worker-rest")["host-a"]).toEqual(["piece-8"]);
    expect(q.component.data("piece-8").properties).toEqual({ stamina: 1 });
    expect(q.player.order()).toEqual(getPlayerOrder(table));
    expect(q.player.resources("player-2")).toEqual(
      getPlayerResources(table, "player-2"),
    );
    expect(q.component.location("card-2")).toEqual(
      getComponentLocation(table, "card-2"),
    );
    expect(q.component.zone("card-2")).toEqual(
      getComponentZoneLocation(table, "card-2"),
    );
  });

  test("state-bound table query facade preserves runtime reads", () => {
    const table = createSpatialTable();
    const state = {
      table,
      flow: { activePlayers: ["player-1"] },
    };

    const q = createStateQueries(state, definitions);

    expect(q.board("hex-board").state).toBe(
      getHexBoard(table, definitions, "hex-board"),
    );
    expect(q.zone("draw-deck")).toEqual(
      getZoneComponents(table, definitions, { zoneId: "draw-deck" }),
    );
    expect(q.player.order()).toEqual(getPlayerOrder(table));
  });
});
