import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

const actionSpaces = [
  { id: "timberYard", name: "Timber Yard", row: 0, col: 0 },
  { id: "stoneYard", name: "Stone Yard", row: 0, col: 1 },
  { id: "patronSquare", name: "Patron Square", row: 0, col: 2 },
  { id: "exchangeHouse", name: "Exchange House", row: 0, col: 3 },
  { id: "mosaicBench", name: "Mosaic Bench", row: 0, col: 4 },
] as const;

const workshopCells = [
  { id: "cell-r0-c0", row: 0, col: 0 },
  { id: "cell-r0-c1", row: 0, col: 1 },
  { id: "cell-r0-c2", row: 0, col: 2 },
  { id: "cell-r1-c0", row: 1, col: 0 },
  { id: "cell-r1-c1", row: 1, col: 1 },
  { id: "cell-r1-c2", row: 1, col: 2 },
] as const;

export default defineTopologyManifest({
  players: {
    minPlayers: 2,
    maxPlayers: 2,
    optimalPlayers: 2,
  },
  resources: [
    { id: "wood", name: "Wood", icon: "🪵" },
    { id: "stone", name: "Stone", icon: "🪨" },
    { id: "coin", name: "Coin", icon: "🪙" },
  ],
  cardSets: [],
  zones: [],
  boardTemplates: [
    {
      id: "action-board-template",
      name: "Five Workshop Sites",
      layout: "square",
      spaceFieldsSchema: {
        properties: {
          actionId: {
            type: "enum",
            enums: actionSpaces.map(({ id }) => id),
          },
        },
      },
      spaces: actionSpaces.map(({ id, row, col }) => ({
        id,
        row,
        col,
        typeId: "action-space",
        fields: { actionId: id },
      })),
    },
    {
      id: "workshop-tableau-template",
      name: "Workshop Tableau",
      layout: "square",
      spaces: workshopCells.map(({ id, row, col }) => ({
        id,
        row,
        col,
        typeId: "mosaic-cell",
      })),
    },
  ],
  boards: [
    {
      id: "action-board",
      name: "Action Board",
      layout: "square",
      scope: "shared",
      templateId: "action-board-template",
    },
    {
      id: "workshop-tableau",
      name: "Workshop Tableau",
      layout: "square",
      scope: "perPlayer",
      templateId: "workshop-tableau-template",
    },
  ],
  pieceTypes: [
    { id: "ordinary", name: "Ordinary Worker" },
    { id: "master", name: "Master Worker" },
  ],
  pieceSeeds: [
    {
      id: "ordinary-p1-1",
      typeId: "ordinary",
      ownerId: "player-1",
      home: { type: "detached" },
    },
    {
      id: "ordinary-p1-2",
      typeId: "ordinary",
      ownerId: "player-1",
      home: { type: "detached" },
    },
    {
      id: "master-p1",
      typeId: "master",
      ownerId: "player-1",
      home: { type: "detached" },
    },
    {
      id: "ordinary-p2-1",
      typeId: "ordinary",
      ownerId: "player-2",
      home: { type: "detached" },
    },
    {
      id: "ordinary-p2-2",
      typeId: "ordinary",
      ownerId: "player-2",
      home: { type: "detached" },
    },
    {
      id: "master-p2",
      typeId: "master",
      ownerId: "player-2",
      home: { type: "detached" },
    },
  ],
  dieTypes: [],
  dieSeeds: [],
  setupOptions: [],
  setupProfiles: [
    {
      id: "standard",
      name: "Standard",
      description:
        "Two public workshops, five fixed action spaces, and no setup entropy.",
    },
  ],
});
