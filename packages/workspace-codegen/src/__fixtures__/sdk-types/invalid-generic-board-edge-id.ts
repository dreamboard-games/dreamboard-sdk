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
      id: "generic-board",
      name: "Generic Board",
      layout: "generic",
      scope: "shared",
      boardFieldsSchema: {
        properties: {
          edgeRef: {
            type: "edgeId",
          },
        },
      },
      fields: {
        edgeRef: "square-edge:0,0::1,0",
      },
      spaces: [{ id: "space-a" }],
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
