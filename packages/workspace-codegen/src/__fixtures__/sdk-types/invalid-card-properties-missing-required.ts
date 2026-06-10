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
        properties: {
          value: { type: "integer" },
          suit: { type: "enum", enums: ["sun", "moon"] },
          tags: { type: "array", items: { type: "string" } },
          metadata: {
            type: "object",
            properties: {
              label: { type: "string" },
              scoreByPlayer: {
                type: "record",
                values: { type: "integer" },
              },
            },
          },
        },
      },
      cards: [
        {
          type: "ace",
          name: "Ace",
          count: 1,
          properties: {
            suit: "sun",
            tags: ["starter"],
            metadata: {
              label: "Ace",
              scoreByPlayer: {
                "player-1": 1,
              },
            },
          },
        },
      ],
    },
  ],
  zones: [],
  boardTemplates: [],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
} as const);
