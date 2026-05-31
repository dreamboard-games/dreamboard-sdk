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
          metadata: {
            type: "object",
            properties: {
              note: {
                type: "string",
              },
            },
          },
        },
      },
      fields: {
        metadata: {
          note: 1,
        },
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
