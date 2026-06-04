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
      spaceFieldsSchema: {
        properties: {
          terrain: {
            type: "enum",
            enums: ["grass", "water"],
          },
        },
      },
      spaces: [
        {
          id: "square-a",
          row: 0,
          col: 0,
          fields: {
            terrain: "lava",
          },
        },
      ],
    },
  ],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
} as const);
