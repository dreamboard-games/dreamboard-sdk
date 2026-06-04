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
      id: "die-holder",
      name: "Die Holder",
      sides: 6,
      slots: [{ id: "staging", name: "Staging" }],
    },
    {
      id: "d6",
      name: "D6",
      sides: 6,
    },
  ],
  dieSeeds: [
    {
      id: "holder-a",
      typeId: "die-holder",
    },
    {
      id: "d6-a",
      typeId: "d6",
      home: {
        type: "slot",
        host: {
          kind: "die",
          id: "holder-a",
        },
        slotId: "missing-slot",
      },
    },
  ],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
} as const);
