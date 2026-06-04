import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

defineTopologyManifest({
  players: {
    minPlayers: 2,
    maxPlayers: 2,
    optimalPlayers: 2,
  },
  cardSets: [
    {
      id: "main",
      name: "Main",
      type: "manual",
      cardSchema: {
        type: "object",
        properties: {},
      },
      cards: [
        {
          type: "ace",
          name: "Ace",
          count: 1,
          properties: {},
          home: {
            type: "zone",
            zoneId: "discard",
          },
        },
      ],
    },
  ],
  zones: [
    {
      id: "draw",
      name: "Draw",
      scope: "shared",
      allowedCardSetIds: ["missing-card-set"],
    },
  ],
  boardTemplates: [],
  boards: [
    {
      id: "board-a",
      name: "Board A",
      layout: "square",
      scope: "shared",
      spaces: [{ id: "space-a", row: 0, col: 0 }],
      containers: [
        { id: "supply-a", name: "Supply A", host: { type: "board" } },
      ],
    },
    {
      id: "board-b",
      name: "Board B",
      layout: "square",
      scope: "shared",
      spaces: [{ id: "space-b", row: 0, col: 0 }],
      containers: [
        { id: "supply-b", name: "Supply B", host: { type: "board" } },
      ],
    },
  ],
  pieceTypes: [
    { id: "meeple", name: "Meeple" },
    {
      id: "player-mat",
      name: "Player Mat",
      slots: [{ id: "worker-rest", name: "Worker Rest" }],
    },
  ],
  pieceSeeds: [
    {
      id: "mat-alpha",
      typeId: "player-mat",
    },
    {
      id: "worker-a",
      typeId: "meeple",
      ownerId: "player-1",
      home: {
        type: "space",
        boardId: "board-a",
        spaceId: "space-b",
      },
    },
    {
      typeId: "meeple",
      ownerId: "player-1",
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
  dieTypes: [
    { id: "d6", name: "D6", sides: 6 },
    {
      id: "die-holder",
      name: "Die Holder",
      sides: 6,
      slots: [{ id: "staging", name: "Staging" }],
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
  setupOptions: [
    {
      id: "mode",
      name: "Mode",
      choices: [{ id: "standard", label: "Standard" }],
    },
  ],
  setupProfiles: [
    {
      id: "standard-profile",
      name: "Standard",
      optionValues: {
        mode: "draft",
      },
    },
  ],
} as const);
