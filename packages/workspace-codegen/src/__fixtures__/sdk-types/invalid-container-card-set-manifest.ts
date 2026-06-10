import { defineTopologyManifest } from "@dreamboard-games/sdk-types";

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
  boardTemplates: [
    {
      id: "template",
      name: "Template",
      layout: "square",
      spaces: [{ id: "space-a", row: 0, col: 0 }],
      containers: [
        {
          id: "supply",
          name: "Supply",
          host: { type: "board" },
          allowedCardSetIds: ["missing-card-set"],
        },
      ],
    },
  ],
  boards: [
    {
      id: "board",
      name: "Board",
      layout: "square",
      scope: "shared",
      templateId: "template",
      spaces: [{ id: "space-a", row: 0, col: 0 }],
      containers: [
        {
          id: "supply",
          name: "Supply",
          host: { type: "board" },
          allowedCardSetIds: ["main", "missing-card-set"],
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
