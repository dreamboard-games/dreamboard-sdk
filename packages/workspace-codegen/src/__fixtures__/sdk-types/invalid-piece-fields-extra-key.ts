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
      cards: [{ type: "ace", name: "Ace", count: 1, properties: {} }],
    },
  ],
  zones: [
    {
      id: "draw",
      name: "Draw",
      scope: "shared",
      allowedCardSetIds: ["main"],
    },
  ],
  boardTemplates: [],
  boards: [],
  pieceTypes: [
    {
      id: "meeple",
      name: "Meeple",
      fieldsSchema: {
        properties: {
          stamina: { type: "integer" },
          state: { type: "enum", enums: ["ready", "spent"] },
          linkedCard: { type: "cardId" },
          assignedZone: { type: "zoneId" },
        },
      },
    },
  ],
  pieceSeeds: [
    {
      id: "worker-a",
      typeId: "meeple",
      fields: {
        stamina: 2,
        state: "ready",
        linkedCard: "ace",
        assignedZone: "draw",
        extra: true,
      },
    },
  ],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
} as const);
