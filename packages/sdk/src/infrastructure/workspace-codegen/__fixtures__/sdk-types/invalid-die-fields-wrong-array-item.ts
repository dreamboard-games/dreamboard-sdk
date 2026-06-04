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
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [
    {
      id: "d6",
      name: "D6",
      sides: 6,
      fieldsSchema: {
        properties: {
          owner: { type: "playerId" },
          resource: { type: "resourceId" },
          history: { type: "array", items: { type: "integer" } },
        },
      },
    },
  ],
  dieSeeds: [
    {
      id: "die-a",
      typeId: "d6",
      fields: {
        owner: "player-1",
        resource: "supply",
        history: ["six"],
      },
    },
  ],
  resources: [{ id: "supply", name: "Supply" }],
  setupOptions: [],
  setupProfiles: [],
} as const);
