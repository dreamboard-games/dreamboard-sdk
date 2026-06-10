import { defineTopologyManifest } from "@dreamboard-games/sdk-types";

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
      ownerId: "player-1",
      home: {
        type: "space",
        boardId: "player-grid",
        spaceId: "cell-a",
      },
    },
  ],
  dieTypes: [{ id: "d6", name: "D6", sides: 6 }],
  dieSeeds: [
    {
      id: "die-a",
      typeId: "d6",
      ownerId: "player-1",
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
