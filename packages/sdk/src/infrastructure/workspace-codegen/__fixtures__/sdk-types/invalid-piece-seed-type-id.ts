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
  pieceTypes: [
    {
      id: "meeple",
      name: "Meeple",
    },
  ],
  pieceSeeds: [
    {
      id: "worker-a",
      typeId: "missing-meeple",
    },
  ],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
} as const);
