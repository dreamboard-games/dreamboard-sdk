import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

defineTopologyManifest({
  players: {
    minPlayers: 2,
    maxPlayers: 2,
    optimalPlayers: 2,
  },
  cardSets: [],
  zones: [],
  boardTemplates: [
    {
      id: "square-template",
      name: "Square Template",
      layout: "square",
      boardFieldsSchema: {
        properties: {
          activeEdgeId: { type: "edgeId" },
        },
      },
      spaces: [
        { id: "square-a", row: 0, col: 0 },
        { id: "square-b", row: 0, col: 1 },
      ],
    },
  ],
  boards: [
    {
      id: "square-board",
      name: "Square Board",
      layout: "square",
      scope: "shared",
      templateId: "square-template",
      fields: {
        activeEdgeId: "square-edge:missing",
      },
      spaces: [{ id: "square-a", row: 0, col: 0 }],
    },
  ],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
} as const);
