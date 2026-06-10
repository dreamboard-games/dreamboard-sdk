import type { RuntimeTableRecord } from "../../reducer";
import { perPlayer, type PlayerId } from "../per-player";

export function createSpatialTable(): RuntimeTableRecord {
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
