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
      vertexFieldsSchema: {
        properties: {
          homeVertexId: {
            type: "vertexId",
          },
        },
      },
      spaces: [
        { id: "hex-a", q: 0, r: 0 },
        { id: "hex-b", q: 1, r: 0 },
        { id: "hex-c", q: 0, r: 1 },
      ],
      vertices: [
        {
          ref: { spaces: ["hex-a", "hex-b", "hex-c"] },
          fields: {
            homeVertexId: "hex-vertex:missing",
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
