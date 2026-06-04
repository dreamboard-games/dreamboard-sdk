import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

defineTopologyManifest({
  players: {
    minPlayers: 2,
    maxPlayers: 2,
    optimalPlayers: 2,
  },
  cardSets: [
    {
      id: "main",
      name: "Main",
      type: "manual",
      cardSchema: {
        properties: {},
      },
      cards: [],
    },
  ],
  zones: [],
  boardTemplates: [],
  boards: [
    {
      id: "square-board",
      name: "Square Board",
      layout: "square",
      scope: "shared",
      containerFieldsSchema: {
        properties: {
          anchorSpaceId: {
            type: "spaceId",
          },
        },
      },
      spaces: [
        { id: "square-a", row: 0, col: 0 },
        { id: "square-b", row: 0, col: 1 },
      ],
      containers: [
        {
          id: "slot-a",
          name: "Slot A",
          host: { type: "space", spaceId: "square-a" },
          allowedCardSetIds: ["main"],
          fields: {
            anchorSpaceId: "missing-space",
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
