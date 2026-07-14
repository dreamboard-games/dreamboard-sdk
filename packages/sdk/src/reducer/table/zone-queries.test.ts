import { describe, expect, test } from "bun:test";
import { createStateQueries, createTableQueries } from "../../reducer";
import { perPlayer, type PlayerId } from "../per-player";
import {
  getAdjacentSpaces,
  getBoard,
  getBoardsByTypeId,
  getCard,
  getCardOwner,
  getCardVisibility,
  getComponentContainerLocation,
  getComponentDeckLocation,
  getComponentEdgeLocation,
  getComponentHandLocation,
  getComponentLocation,
  getComponentSlotLocation,
  getComponentSpaceLocation,
  getComponentVertexLocation,
  getComponentZoneLocation,
  getContainer,
  getEdge,
  getHexBoard,
  getIncidentEdges,
  getPlayerOrder,
  getPlayerResources,
  getPlayerZoneCards,
  getSharedZoneCards,
  getSlotOccupants,
  getSlotOccupantsByHost,
  getSpace,
  getSpaceDistance,
  getSquareBoard,
  getVertex,
} from "./index";
import { createSpatialTable } from "./table-test-fixtures";

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
});
