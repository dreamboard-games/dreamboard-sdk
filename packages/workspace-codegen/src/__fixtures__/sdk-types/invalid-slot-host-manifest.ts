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
  pieceTypes: [
    {
      id: "player-mat",
      name: "Player Mat",
      slots: [{ id: "worker-rest", name: "Worker Rest" }],
    },
    {
      id: "worker",
      name: "Worker",
    },
  ],
  pieceSeeds: [
    {
      id: "mat-alpha",
      typeId: "player-mat",
    },
    {
      id: "worker-a",
      typeId: "worker",
      home: {
        type: "slot",
        host: {
          kind: "piece",
          id: "missing-host",
        },
        slotId: "worker-rest",
      },
    },
  ],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
} as const);
