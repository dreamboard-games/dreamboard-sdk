import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

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
      id: "square-board",
      name: "Square Board",
      layout: "square",
      scope: "shared",
      relationFieldsSchema: {
        properties: {
          cost: {
            type: "integer",
          },
        },
      },
      spaces: [
        { id: "square-a", row: 0, col: 0 },
        { id: "square-b", row: 0, col: 1 },
      ],
      relations: [
        {
          typeId: "adjacent",
          fromSpaceId: "square-a",
          toSpaceId: "square-b",
          fields: {
            cost: "high",
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
