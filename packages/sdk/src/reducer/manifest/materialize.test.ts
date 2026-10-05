import { perPlayerInstanceId } from "../../shared/domain/per-player-instance.js";
import { compileManifest } from "./compiler";
import * as z from "zod";
import { expect, test } from "vitest";
import type { GameTopologyManifest } from "../../shared/domain/manifest.js";
import { materializeManifestTable } from "./materialize";
const EMPTY_MANIFEST: GameTopologyManifest = {
  players: {
    minPlayers: 2,
    maxPlayers: 4,
    optimalPlayers: 2,
  },
  cardSets: [],
  zones: [],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
};

test("materializeManifestTable keeps runtime board topology and attached zones board-local", () => {
  const table = compileManifest({
    players: EMPTY_MANIFEST.players,
    cardSets: [],
    boards: [
      {
        id: "board-a",
        name: "Board A",
        layout: "generic",
        scope: "shared",
        spaces: [{ id: "a-1" }, { id: "a-2" }],
      },
      {
        id: "board-b",
        name: "Board B",
        layout: "generic",
        scope: "shared",
        spaces: [{ id: "b-1" }],
      },
      {
        id: "player-board",
        name: "Player Board",
        layout: "generic",
        scope: "perPlayer",
        spaces: [{ id: "player-space" }],
      },
    ],
    zones: [
      { id: "a-row", name: "A row", attachedTo: { board: "board-a" } },
      { id: "b-row", name: "B row", attachedTo: { board: "board-b" } },
      {
        id: "player-row",
        name: "Player row",
        attachedTo: { board: "player-board" },
      },
    ],
  } as const).createInitialTable({ playerIds: ["player-1", "player-2"] });
  const first = perPlayerInstanceId("board", "player-board", "player-1");
  const second = perPlayerInstanceId("board", "player-board", "player-2");
  expect(Object.keys(table.boards.byId["board-a"].spaces)).toEqual([
    "a-1",
    "a-2",
  ]);
  expect(Object.keys(table.boards.byId["board-b"].spaces)).toEqual(["b-1"]);
  expect(table.boards.byId["board-a"].spaces).not.toHaveProperty("b-1");
  expect(table.zones["a-row"]).toEqual({ "board-a": [] });
  expect(table.zones["b-row"]).not.toHaveProperty("board-a");
  expect(Object.keys(table.boards.byId[first].spaces)).toEqual([
    "player-space",
  ]);
  expect(Object.keys(table.zones["player-row"])).toEqual([first, second]);
  expect(table.boards.byId[first].spaces).not.toBe(
    table.boards.byId[second].spaces,
  );
  expect(table.boards.byId[first].spaces["player-space"]).not.toBe(
    table.boards.byId[second].spaces["player-space"],
  );
  expect(table.zones["player-row"][first]).not.toBe(
    table.zones["player-row"][second],
  );
});

test("materializeManifestTable assigns every accepted shared card home explicitly", () => {
  const table = z
    .object({
      cards: z.record(z.string(), z.unknown()),
      zones: z.record(z.string(), z.record(z.string(), z.array(z.string()))),
      componentLocations: z.record(
        z.string(),
        z.record(z.string(), z.unknown()),
      ),
    })
    .parse(
      materializeManifestTable({
        manifest: {
          ...EMPTY_MANIFEST,
          cardSets: [
            {
              id: "market",
              name: "Market",
              defaultHome: { type: "zone", zoneId: "shared-deck" },
              cardSchema: { type: "object", properties: {}, required: [] },
              cards: [
                {
                  id: "omitted",
                  cardType: "omitted",
                  name: "Omitted",
                  count: 1,
                  properties: {},
                },
                {
                  id: "detached",
                  cardType: "detached",
                  name: "Detached",
                  count: 1,
                  home: { type: "detached" },
                  properties: {},
                },
                {
                  id: "zone-card",
                  cardType: "zone-card",
                  name: "Zone",
                  count: 1,
                  home: { type: "zone", zoneId: "shared-deck" },
                  properties: {},
                },
                {
                  id: "space-card",
                  cardType: "space-card",
                  name: "Space",
                  count: 1,
                  home: {
                    type: "space",
                    boardId: "square-board",
                    spaceId: "a1",
                  },
                  properties: {},
                },
                {
                  id: "board-zone-card",
                  cardType: "board-zone-card",
                  name: "Board zone",
                  count: 1,
                  home: {
                    type: "zone",
                    zoneId: "display-row",
                  },
                  properties: {},
                },
                {
                  id: "edge-card",
                  cardType: "edge-card",
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
                  id: "vertex-card",
                  cardType: "vertex-card",
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
                  id: "component-zone-card",
                  cardType: "component-zone-card",
                  name: "Component zone",
                  count: 1,
                  home: {
                    type: "zone",
                    zoneId: "pocket",
                    component: "holder-a",
                  },
                  properties: {},
                },
              ],
            },
          ],
          zones: [
            {
              id: "display-row",
              name: "Display row",
              attachedTo: { board: "square-board" },
            },
            {
              id: "pocket",
              name: "Pocket",
              attachedTo: { pieceType: "holder" },
            },
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
              edges: [],
              vertices: [],
            },
          ],
          pieceTypes: [
            {
              id: "holder",
              name: "Holder",
            },
          ],
          pieceSeeds: [{ id: "holder-a", typeId: "holder" }],
        },
        playerIds: ["player-1", "player-2"],
        shuffleItems: (values) => [...values].reverse(),
      }),
    );

  expect(Object.keys(table.componentLocations)).toEqual([
    "omitted",
    "detached",
    "zone-card",
    "space-card",
    "board-zone-card",
    "edge-card",
    "vertex-card",
    "component-zone-card",
    "holder-a",
  ]);
  expect(table.componentLocations.omitted).toEqual({
    type: "InZone",
    zoneId: "shared-deck",
    hostId: "table",
    playedBy: null,
  });
  expect(table.componentLocations.detached).toEqual({
    type: "Detached",
  });
  expect(table.componentLocations["zone-card"]).toEqual({
    type: "InZone",
    zoneId: "shared-deck",
    hostId: "table",
    playedBy: null,
  });
  expect(table.componentLocations["space-card"]).toMatchObject({
    type: "OnSpace",
    boardId: "square-board",
    spaceId: "a1",
  });
  expect(table.componentLocations["board-zone-card"]).toMatchObject({
    type: "InZone",
    zoneId: "display-row",
    hostId: "square-board",
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
  expect(table.componentLocations["component-zone-card"]).toMatchObject({
    type: "InZone",
    zoneId: "pocket",
    hostId: "holder-a",
  });
  expect(table.zones["shared-deck"].table).toEqual(["omitted", "zone-card"]);
  expect(table.zones["compatible-only"].table).toEqual([]);
});

test("materializeManifestTable rejects unsafe manifest keys before materialization", () => {
  const unsafeManifest: GameTopologyManifest = {
    ...EMPTY_MANIFEST,
    cardSets: [
      {
        id: "unsafe",
        name: "Unsafe",
        defaultHome: { type: "detached" },
        cardSchema: { type: "object", properties: {}, required: [] },
        cards: [
          {
            id: "__proto__",
            cardType: "unsafe",
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
  ).toThrow("Invalid topology manifest");
});

test("inline square metadata and schemas survive topology materialization", () => {
  const board = {
    id: "map",
    name: "Map",
    layout: "square" as const,
    scope: "shared" as const,
    boardFieldsSchema: {
      type: "object",
      properties: { round: { type: "integer", default: 2 } },
      required: [],
    },
    spaceFieldsSchema: {
      type: "object",
      properties: { terrain: { type: "string", default: "" } },
      required: [],
    },
    edgeFieldsSchema: {
      type: "object",
      properties: { cost: { type: "integer", default: 0 } },
      required: [],
    },
    vertexFieldsSchema: {
      type: "object",
      properties: { points: { type: "integer", default: 0 } },
      required: [],
    },
    spaces: [
      { id: "a", row: 0, col: 0, fields: { terrain: "grass" } },
      { id: "b", row: 0, col: 1 },
      { id: "c", row: 1, col: 0 },
      { id: "d", row: 1, col: 1 },
    ],
    edges: [
      {
        ref: { spaces: ["a", "b"] },
        typeId: "road",
        label: "Bridge",
        fields: { cost: 3 },
      },
    ],
    vertices: [
      {
        ref: { spaces: ["a", "b", "c", "d"] },
        typeId: "city",
        fields: { points: 4 },
      },
    ],
  };
  const materialize = (input = board) =>
    materializeManifestTable({
      manifest: { ...EMPTY_MANIFEST, boards: [input] },
      playerIds: ["player-1"],
      shuffleItems: (values) => [...values],
    });
  const result = compileManifest({
    ...EMPTY_MANIFEST,
    boards: [board],
  }).tableSchema.parse(materialize()).boards.byId.map;
  if (result.layout !== "square") throw new Error("Expected square board");
  expect(result.fields).toEqual({ round: 2 });
  expect(result.spaces.a.fields).toEqual({ terrain: "grass" });
  expect(
    Object.values(result.edges).find((edge) => edge.typeId === "road"),
  ).toMatchObject({ label: "Bridge", fields: { cost: 3 } });
  expect(
    Object.values(result.vertices).find((vertex) => vertex.typeId === "city"),
  ).toMatchObject({ fields: { points: 4 } });
  expect(result).not.toHaveProperty("templateId");
  expect(() =>
    materialize({ ...board, edges: [...board.edges, ...board.edges] }),
  ).toThrow("duplicate square edge refs");
  expect(() =>
    materialize({
      ...board,
      vertices: [{ ...board.vertices[0], ref: { spaces: ["missing"] } }],
    }),
  ).toThrow("unknown space 'missing'");
});
