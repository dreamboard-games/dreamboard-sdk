import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

defineTopologyManifest({
  players: {
    minPlayers: 2,
    maxPlayers: 4,
    optimalPlayers: 3,
  },
  cardSets: [],
  zones: [],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [
    {
      id: "d6",
      name: "Standard Die",
    },
  ],
  dieSeeds: [
    {
      id: "d6-a",
      typeId: "d6",
    },
  ],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
});
