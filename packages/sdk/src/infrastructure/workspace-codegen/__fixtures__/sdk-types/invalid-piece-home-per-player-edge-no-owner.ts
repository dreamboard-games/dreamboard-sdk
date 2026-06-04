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
  boards: [
    {
      id: "player-grid",
      name: "Player Grid",
      layout: "square",
      scope: "perPlayer",
      spaces: [
        { id: "cell-a", row: 0, col: 0 },
        { id: "cell-b", row: 0, col: 1 },
      ],
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
        type: "edge",
        boardId: "player-grid",
        ref: {
          spaces: ["cell-a", "cell-b"],
        },
      },
    },
  ],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
} as const);
