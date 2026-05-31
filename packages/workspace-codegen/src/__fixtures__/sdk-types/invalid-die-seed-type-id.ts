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
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [
    {
      id: "d6",
      name: "D6",
      sides: 6,
    },
  ],
  dieSeeds: [
    {
      id: "die-a",
      typeId: "missing-d6",
    },
  ],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
} as const);
