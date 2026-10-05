import { perPlayerInstanceId } from "../../shared/domain/per-player-instance.js";
import { compileManifest } from "./compiler";
import { createTableQueries } from "../table-queries";
import { tileSpaceId } from "../../shared/domain/tile-space.js";
import {
  boardEdgeId,
  boardVertexId,
} from "../../shared/domain/board-element.js";
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
  const compiled = compileManifest({
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
  } as const);
  const table = compiled.createInitialTable({
    playerIds: ["player-1", "player-2"],
  });
  const q = createTableQueries(table, compiled);
  const first = perPlayerInstanceId("board", "player-board", "player-1");
  const second = perPlayerInstanceId("board", "player-board", "player-2");
  expect(Object.keys(q.board("board-a").state.spaces)).toEqual(["a-1", "a-2"]);
  expect(Object.keys(q.board("board-b").state.spaces)).toEqual(["b-1"]);
  expect(q.board("board-a").state.spaces).not.toHaveProperty("b-1");
  expect(table.zones["a-row"]).toEqual({ "board-a": [] });
  expect(table.zones["b-row"]).not.toHaveProperty("board-a");
  expect(Object.keys(q.board(first).state.spaces)).toEqual(["player-space"]);
  expect(Object.keys(table.zones["player-row"])).toEqual([first, second]);
  expect(q.board(first).state.spaces).not.toBe(q.board(second).state.spaces);
  expect(q.board(first).state.spaces["player-space"]).not.toBe(
    q.board(second).state.spaces["player-space"],
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
                    spaceId: tileSpaceId("terrain", "a1"),
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
                    ref: {
                      spaces: [
                        tileSpaceId("terrain", "a1"),
                        tileSpaceId("terrain", "a2"),
                      ],
                    },
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
                    ref: {
                      spaces: ["a1", "a2", "b1", "b2"].map((id) =>
                        tileSpaceId("terrain", id),
                      ),
                    },
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
            },
          ],
          tileTypes: [
            {
              id: "terrain",
              name: "Terrain",
              layout: "square",
              cells: [
                { id: "a1", at: { row: 0, col: 0 } },
                { id: "a2", at: { row: 0, col: 1 } },
                { id: "b1", at: { row: 1, col: 0 } },
                { id: "b2", at: { row: 1, col: 1 } },
              ],
            },
          ],
          tileSeeds: [
            {
              id: "terrain",
              typeId: "terrain",
              home: {
                type: "board",
                boardId: "square-board",
                layout: "square",
                col: 0,
                row: 0,
                rotation: 0,
              },
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

  expect(Object.keys(table.componentLocations).sort()).toEqual(
    [
      "omitted",
      "detached",
      "zone-card",
      "space-card",
      "board-zone-card",
      "edge-card",
      "vertex-card",
      "component-zone-card",
      "holder-a",
      "terrain",
    ].sort(),
  );
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
    spaceId: tileSpaceId("terrain", "a1"),
  });
  expect(table.componentLocations["board-zone-card"]).toMatchObject({
    type: "InZone",
    zoneId: "display-row",
    hostId: "square-board",
  });
  expect(table.componentLocations["edge-card"]).toMatchObject({
    type: "OnEdge",
    boardId: "square-board",
    edgeId: boardEdgeId("square", "square-board", "1,0:v"),
  });
  expect(table.componentLocations["vertex-card"]).toMatchObject({
    type: "OnVertex",
    boardId: "square-board",
    vertexId: boardVertexId("square", "square-board", "1,1"),
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

test("square tile metadata and defaults survive topology derivation", () => {
  const source = {
    players: { minPlayers: 1, maxPlayers: 2 },
    cardSets: [],
    boards: [
      {
        id: "map",
        name: "Map",
        layout: "square",
        scope: "shared",
        boardFieldsSchema: z.object({ round: z.number().int().default(2) }),
      },
    ],
    tileTypes: [
      {
        id: "terrain",
        name: "Terrain",
        layout: "square",
        cellFieldsSchema: z.object({ terrain: z.string().default("") }),
        edgeFieldsSchema: z.object({ cost: z.number().int().default(0) }),
        vertexFieldsSchema: z.object({ points: z.number().int().default(0) }),
        cells: [
          { id: "a", at: { row: 0, col: 0 }, fields: { terrain: "grass" } },
          { id: "b", at: { row: 0, col: 1 } },
          { id: "c", at: { row: 1, col: 0 } },
          { id: "d", at: { row: 1, col: 1 } },
        ],
        edges: [
          {
            cellId: "a",
            side: 0,
            typeId: "road",
            label: "Bridge",
            fields: { cost: 3 },
          },
        ],
        vertices: [
          { cellId: "a", corner: 0, typeId: "city", fields: { points: 4 } },
        ],
      },
    ],
    tileSeeds: [
      {
        id: "tile",
        typeId: "terrain",
        home: {
          type: "board",
          boardId: "map",
          layout: "square",
          row: 0,
          col: 0,
          rotation: 0,
        },
      },
    ],
  } as const;
  const compiled = compileManifest(source);
  const table = compiled.createInitialTable({ playerIds: ["player-1"] });
  expect(compiled.tableSchema.safeParse(table).success).toBe(true);
  const result = createTableQueries(table, compiled).board("map").state;
  expect(result.fields).toEqual({ round: 2 });
  expect(result.spaces[tileSpaceId("tile", "a")].fields).toEqual({
    terrain: "grass",
  });
  expect(result.spaces[tileSpaceId("tile", "b")].fields).toEqual({
    terrain: "",
  });
  expect(result.edges.find((edge) => edge.typeId === "road")).toMatchObject({
    label: "Bridge",
    fields: { cost: 3 },
  });
  expect(
    result.vertices.find((vertex) => vertex.typeId === "city"),
  ).toMatchObject({ fields: { points: 4 } });
  expect(table.boards.map).toEqual({
    baseId: "map",
    visibility: "public",
    relations: [],
  });
  expect(() =>
    compileManifest({
      ...source,
      tileTypes: [
        {
          ...source.tileTypes[0],
          edges: [...source.tileTypes[0].edges, ...source.tileTypes[0].edges],
        },
      ],
    }),
  ).toThrow(/duplicate/i);
  expect(() =>
    compileManifest({
      ...source,
      // @ts-expect-error Runtime admission also rejects unknown local annotation cells.
      tileTypes: [
        {
          ...source.tileTypes[0],
          vertices: [{ ...source.tileTypes[0].vertices[0], cellId: "missing" }],
        },
      ],
    }),
  ).toThrow(/missing/);
});
