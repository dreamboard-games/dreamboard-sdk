import { defineTopologyManifest } from "@dreamboard-games/sdk-types";

defineTopologyManifest({
  players: {
    minPlayers: 2,
    maxPlayers: 2,
    optimalPlayers: 2,
  },
  cardSets: [],
  zones: [],
  boardTemplates: [],
  boards: [
    {
      id: "hex-board",
      name: "Hex Board",
      layout: "hex",
      scope: "shared",
      edgeFieldsSchema: {
        properties: {
          pairedEdgeId: {
            type: "edgeId",
          },
        },
      },
      spaces: [
        { id: "hex-a", q: 0, r: 0 },
        { id: "hex-b", q: 1, r: 0 },
        { id: "hex-c", q: 0, r: 1 },
      ],
      edges: [
        {
          ref: { spaces: ["hex-a", "hex-b"] },
          fields: {
            pairedEdgeId: "hex-edge:missing",
          },
        },
      ],
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
