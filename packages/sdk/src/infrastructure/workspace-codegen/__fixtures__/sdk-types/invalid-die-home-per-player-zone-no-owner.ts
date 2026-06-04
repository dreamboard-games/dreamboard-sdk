import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

defineTopologyManifest({
  players: {
    minPlayers: 2,
    maxPlayers: 2,
    optimalPlayers: 2,
  },
  cardSets: [],
  zones: [
    {
      id: "main-hand",
      name: "Main Hand",
      scope: "perPlayer",
    },
  ],
  boardTemplates: [],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [{ id: "d6", name: "D6", sides: 6 }],
  dieSeeds: [
    {
      id: "die-a",
      typeId: "d6",
      home: {
        type: "zone",
        zoneId: "main-hand",
      },
    },
  ],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
} as const);
