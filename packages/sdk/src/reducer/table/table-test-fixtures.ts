import * as z from "zod";
import { compileManifest } from "../manifest/compiler.js";
import type { RuntimeTableRecord } from "../model/table.js";
import { tileSpaceId } from "../../shared/domain/tile-space.js";
import { createTableQueries } from "../table-queries.js";

export const spatialManifest = compileManifest({
  players: { minPlayers: 2, maxPlayers: 2 },
  zones: [
    { id: "draw-deck", name: "Draw", scope: "shared", visibility: "public" },
    {
      id: "special-deck",
      name: "Special",
      scope: "shared",
      visibility: "public",
    },
    { id: "supply", name: "Supply", scope: "shared", visibility: "public" },
    {
      id: "market-row",
      name: "Market",
      attachedTo: { board: "main-board" },
      visibility: "public",
    },
    {
      id: "restricted-row",
      name: "Restricted",
      attachedTo: { board: "main-board" },
      allowedCardSetIds: ["special"],
      visibility: "public",
    },
    {
      id: "cell-storage",
      name: "Cells",
      attachedTo: { board: "square-board" },
      visibility: "public",
    },
  ],
  cardSets: [
    {
      id: "main",
      name: "Main",
      cardSchema: z.object({}),
      defaultHome: { type: "zone", zoneId: "draw-deck" },
      cards: [
        {
          id: "card-1",
          name: "Card",
          cardType: "card",
          count: 1,
          properties: {},
        },
      ],
    },
    {
      id: "special",
      name: "Special",
      cardSchema: z.object({}),
      defaultHome: { type: "zone", zoneId: "special-deck" },
      cards: [],
    },
  ],
  pieceTypes: [{ id: "token", name: "Token" }],
  pieceSeeds: [
    {
      id: "piece-1",
      typeId: "token",
      home: { type: "zone", zoneId: "supply" },
    },
  ],
  dieTypes: [{ id: "d6", name: "D6", sides: 6 }],
  dieSeeds: [
    { id: "die-1", typeId: "d6", home: { type: "zone", zoneId: "supply" } },
  ],
  resources: [{ id: "coins", name: "Coins" }],
  boards: [
    {
      id: "main-board",
      name: "Main",
      layout: "generic",
      scope: "shared",
      typeId: "track",
      spaces: [
        { id: "space-a", typeId: "slot" },
        { id: "space-b", typeId: "slot" },
      ],
      relations: [
        {
          id: "adjacent",
          typeId: "adjacent",
          fromSpaceId: "space-a",
          toSpaceId: "space-b",
          directed: false,
        },
      ],
    },
    {
      id: "hex-board",
      name: "Hex",
      layout: "hex",
      scope: "shared",
      typeId: "map",
    },
    {
      id: "square-board",
      name: "Square",
      layout: "square",
      scope: "shared",
      typeId: "grid",
    },
  ],
  tileTypes: [
    {
      id: "hex-terrain",
      name: "Hex terrain",
      layout: "hex",
      cells: [
        { id: "space-a", at: { q: 0, r: 0 }, typeId: "land" },
        { id: "space-b", at: { q: 1, r: 0 }, typeId: "land" },
        { id: "space-c", at: { q: 0, r: 1 }, typeId: "land" },
      ],
      edges: [{ cellId: "space-a", side: 0, typeId: "road-slot" }],
      vertices: [{ cellId: "space-a", corner: 0, typeId: "settlement-slot" }],
    },
    {
      id: "square-terrain",
      name: "Square terrain",
      layout: "square",
      cells: [
        { id: "cell-a1", at: { col: 0, row: 0 }, typeId: "start" },
        { id: "cell-a2", at: { col: 1, row: 0 }, typeId: "path" },
        { id: "cell-b1", at: { col: 0, row: 1 }, typeId: "path" },
        { id: "cell-b2", at: { col: 1, row: 1 }, typeId: "goal" },
      ],
      edges: [{ cellId: "cell-a1", side: 0, typeId: "road-slot" }],
      vertices: [{ cellId: "cell-a1", corner: 0, typeId: "corner" }],
    },
  ],
  tileSeeds: [
    {
      id: "hex-tile",
      typeId: "hex-terrain",
      home: {
        type: "board",
        boardId: "hex-board",
        layout: "hex",
        q: 0,
        r: 0,
        rotation: 0,
      },
    },
    {
      id: "square-tile",
      typeId: "square-terrain",
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
} as const);
export const spatialIds = {
  hexA: tileSpaceId("hex-tile", "space-a"),
  hexB: tileSpaceId("hex-tile", "space-b"),
  hexC: tileSpaceId("hex-tile", "space-c"),
  squareA1: tileSpaceId("square-tile", "cell-a1"),
  squareA2: tileSpaceId("square-tile", "cell-a2"),
  squareB1: tileSpaceId("square-tile", "cell-b1"),
  squareB2: tileSpaceId("square-tile", "cell-b2"),
};
type SpatialTable = Omit<RuntimeTableRecord, "boards" | "tiles"> &
  Pick<
    ReturnType<typeof spatialManifest.createInitialTable>,
    "boards" | "tiles"
  >;
export function createSpatialTable(): SpatialTable {
  const table: SpatialTable = spatialManifest.createInitialTable({
    playerIds: ["player-1", "player-2"],
  });
  table.resources["player-1"].coins = 2;
  table.resources["player-2"].coins = 5;
  return table;
}
export function spatialElements() {
  const q = createTableQueries(
    spatialManifest.createInitialTable({ playerIds: ["player-1", "player-2"] }),
    spatialManifest,
  );
  const hex = q.board("hex-board"),
    square = q.board("square-board");
  return {
    hexEdge: hex.edge(spatialIds.hexA, spatialIds.hexB),
    hexVertex: hex.vertex(spatialIds.hexA, spatialIds.hexB, spatialIds.hexC),
    squareEdge: square.state.edges.find(
      (edge) =>
        edge.spaceIds.includes(spatialIds.squareA1) &&
        edge.spaceIds.includes(spatialIds.squareA2),
    )!.id,
    squareVertex: square.state.vertices.find(
      (vertex) => vertex.spaceIds.length === 4,
    )!.id,
  };
}

export const spatialDefinitions = spatialManifest;
