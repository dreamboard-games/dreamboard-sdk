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
  boards: [
    {
      id: "player-grid",
      name: "Player Grid",
      layout: "square",
      scope: "perPlayer",
      spaces: [{ id: "cell-a", row: 0, col: 0 }],
      relations: [],
      containers: [],
      edges: [],
      vertices: [],
    },
  ],
  pieceTypes: [{ id: "meeple", name: "Meeple" }],
  pieceSeeds: [
    {
      id: "worker-a",
      typeId: "meeple",
      home: {
        type: "space",
        boardId: "player-grid",
        spaceId: "cell-a",
      },
    },
  ],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
} as const);
