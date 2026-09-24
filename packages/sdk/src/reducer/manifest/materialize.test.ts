import { expect, test } from "vitest";
import type { GameTopologyManifest } from "@dreamboard-games/sdk-types";
import { materializeManifestTable } from "./materialize";
const EMPTY_MANIFEST: GameTopologyManifest = {
  players: {
    minPlayers: 2,
    maxPlayers: 4,
    optimalPlayers: 2,
  },
  cardSets: [],
  zones: [],
  boardTemplates: [],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
};

test("materializeManifestTable keeps runtime board topology board-local", () => {
  const table = materializeManifestTable({
    manifest: {
      ...EMPTY_MANIFEST,
      boards: [
        {
          id: "board-a",
          name: "Board A",
          layout: "generic",
          scope: "shared",
          spaceFieldsSchema: {
            properties: {
              marker: { type: "string" },
            },
          },
          containerFieldsSchema: {
            properties: {
              capacity: { type: "integer" },
            },
          },
          spaces: [
            { id: "a-1", fields: { marker: "alpha" } },
            { id: "a-2", fields: { marker: "bravo" } },
          ],
          relations: [],
          containers: [
            {
              id: "a-row",
              name: "A Row",
              host: { type: "board" },
              fields: { capacity: 2 },
            },
          ],
        },
        {
          id: "board-b",
          name: "Board B",
          layout: "generic",
          scope: "shared",
          spaceFieldsSchema: {
            properties: {
              marker: { type: "string" },
            },
          },
          spaces: [{ id: "b-1", fields: { marker: "charlie" } }],
          relations: [],
          containers: [
            {
              id: "b-row",
              name: "B Row",
              host: { type: "board" },
            },
          ],
        },
        {
          id: "player-board",
          name: "Player Board",
          layout: "generic",
          scope: "perPlayer",
          spaces: [{ id: "player-space" }],
          relations: [],
          containers: [
            {
              id: "player-row",
              name: "Player Row",
              host: { type: "board" },
            },
          ],
        },
      ],
    },
    playerIds: ["player-1", "player-2"],
    shuffleItems: (values) => [...values],
  }) as {
    boards: {
      byId: Record<
        string,
        {
          spaces: Record<string, unknown>;
          containers: Record<string, unknown>;
        }
      >;
    };
  };

  expect(Object.keys(table.boards.byId["board-a"].spaces).sort()).toEqual([
    "a-1",
    "a-2",
  ]);
  expect(Object.keys(table.boards.byId["board-b"].spaces)).toEqual(["b-1"]);
  expect(table.boards.byId["board-a"].spaces).not.toHaveProperty("b-1");
  expect(table.boards.byId["board-b"].containers).not.toHaveProperty("a-row");
  expect(
    Object.keys(table.boards.byId["player-board:player-1"].spaces),
  ).toEqual(["player-space"]);
  expect(
    Object.keys(table.boards.byId["player-board:player-2"].containers),
  ).toEqual(["player-row"]);
  expect(table.boards.byId["player-board:player-1"].spaces).not.toBe(
    table.boards.byId["player-board:player-2"].spaces,
  );
  expect(
    table.boards.byId["player-board:player-1"].spaces["player-space"],
  ).not.toBe(table.boards.byId["player-board:player-2"].spaces["player-space"]);
});

test("materializeManifestTable assigns every accepted shared card home explicitly", () => {
  const table = materializeManifestTable({
    manifest: {
      ...EMPTY_MANIFEST,
      cardSets: [
        {
          type: "manual",
          id: "market",
          name: "Market",
          defaultHome: { type: "zone", zoneId: "shared-deck" },
          cardSchema: { properties: {} },
          cards: [
            { type: "omitted", name: "Omitted", count: 1, properties: {} },
            {
              type: "detached",
              name: "Detached",
              count: 1,
              home: { type: "detached" },
              properties: {},
            },
            {
              type: "zone-card",
              name: "Zone",
              count: 1,
              home: { type: "zone", zoneId: "shared-deck" },
              properties: {},
            },
            {
              type: "space-card",
              name: "Space",
              count: 1,
              home: { type: "space", boardId: "square-board", spaceId: "a1" },
              properties: {},
            },
            {
              type: "container-card",
              name: "Container",
              count: 1,
              home: {
                type: "container",
                boardId: "square-board",
                containerId: "display-row",
              },
              properties: {},
            },
            {
              type: "edge-card",
              name: "Edge",
              count: 1,
              home: {
                type: "edge",
                boardId: "square-board",
                ref: { spaces: ["a1", "a2"] },
              },
              properties: {},
            },
            {
              type: "vertex-card",
              name: "Vertex",
              count: 1,
              home: {
                type: "vertex",
                boardId: "square-board",
                ref: { spaces: ["a1", "a2", "b1", "b2"] },
              },
              properties: {},
            },
            {
              type: "slot-card",
              name: "Slot",
              count: 1,
              home: {
                type: "slot",
                host: { kind: "piece", id: "holder-a" },
                slotId: "pocket",
              },
              properties: {},
            },
          ],
        },
      ],
      zones: [
        {
          id: "shared-deck",
          name: "Shared Deck",
          scope: "shared",
          allowedCardSetIds: ["market"],
        },
        {
          id: "compatible-only",
          name: "Compatible Only",
          scope: "shared",
          allowedCardSetIds: ["market"],
        },
      ],
      boards: [
        {
          id: "square-board",
          name: "Square Board",
          layout: "square",
          scope: "shared",
          spaces: [
            { id: "a1", row: 0, col: 0 },
            { id: "a2", row: 0, col: 1 },
            { id: "b1", row: 1, col: 0 },
            { id: "b2", row: 1, col: 1 },
          ],
          relations: [],
          containers: [
            {
              id: "display-row",
              name: "Display Row",
              host: { type: "board" },
            },
          ],
          edges: [],
          vertices: [],
        },
      ],
      pieceTypes: [
        {
          id: "holder",
          name: "Holder",
          slots: [{ id: "pocket" }],
        },
      ],
      pieceSeeds: [{ id: "holder-a", typeId: "holder" }],
    },
    playerIds: ["player-1", "player-2"],
    shuffleItems: (values) => [...values].reverse(),
  }) as {
    cards: Record<string, unknown>;
    zones: { shared: Record<string, string[]> };
    decks: Record<string, string[]>;
    componentLocations: Record<string, Record<string, unknown>>;
  };

  expect(Object.keys(table.componentLocations)).toEqual([
    "omitted",
    "detached",
    "zone-card",
    "space-card",
    "container-card",
    "edge-card",
    "vertex-card",
    "slot-card",
    "holder-a",
  ]);
  expect(table.componentLocations.omitted).toEqual({
    type: "InDeck",
    deckId: "shared-deck",
    playedBy: null,
    position: 0,
  });
  expect(table.componentLocations.detached).toEqual({
    type: "Detached",
  });
  expect(table.componentLocations["zone-card"]).toEqual({
    type: "InDeck",
    deckId: "shared-deck",
    playedBy: null,
    position: 1,
  });
  expect(table.componentLocations["space-card"]).toMatchObject({
    type: "OnSpace",
    boardId: "square-board",
    spaceId: "a1",
  });
  expect(table.componentLocations["container-card"]).toMatchObject({
    type: "InContainer",
    boardId: "square-board",
    containerId: "display-row",
  });
  expect(table.componentLocations["edge-card"]).toMatchObject({
    type: "OnEdge",
    boardId: "square-board",
    edgeId: "square-edge:1,0::1,1",
  });
  expect(table.componentLocations["vertex-card"]).toMatchObject({
    type: "OnVertex",
    boardId: "square-board",
    vertexId: "square-vertex:1,1",
  });
  expect(table.componentLocations["slot-card"]).toMatchObject({
    type: "InSlot",
    host: { kind: "piece", id: "holder-a" },
    slotId: "pocket",
  });
  expect(table.zones.shared["shared-deck"]).toEqual(["omitted", "zone-card"]);
  expect(table.decks["shared-deck"]).toEqual(["omitted", "zone-card"]);
  expect(table.zones.shared["compatible-only"]).toEqual([]);
});

test("materializeManifestTable rejects unsafe manifest keys before materialization", () => {
  const unsafeManifest: GameTopologyManifest = {
    ...EMPTY_MANIFEST,
    cardSets: [
      {
        type: "manual",
        id: "unsafe",
        name: "Unsafe",
        defaultHome: { type: "detached" },
        cardSchema: { properties: {} },
        cards: [
          {
            type: "__proto__",
            name: "Unsafe Card",
            count: 1,
            properties: {},
          },
        ],
      },
    ],
  };

  expect(() =>
    materializeManifestTable({
      manifest: unsafeManifest,
      playerIds: ["player-1", "player-2"],
      shuffleItems: (values) => [...values],
    }),
  ).toThrow("Cannot materialize invalid topology manifest");
});
