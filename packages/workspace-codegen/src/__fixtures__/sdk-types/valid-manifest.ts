import { defineTopologyManifest } from "@dreamboard-games/sdk-types";

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
        properties: {
          value: {
            type: "integer",
          },
          suit: {
            type: "enum",
            enums: ["sun", "moon"],
          },
          tags: {
            type: "array",
            items: {
              type: "string",
            },
          },
          metadata: {
            type: "object",
            properties: {
              label: {
                type: "string",
              },
              scoreByPlayer: {
                type: "record",
                values: {
                  type: "integer",
                },
              },
            },
          },
        },
      },
      cards: [
        {
          type: "ace",
          name: "Ace",
          count: 1,
          properties: {
            value: 1,
            suit: "sun",
            tags: ["starter"],
            metadata: {
              label: "Ace",
              scoreByPlayer: {
                "player-1": 2,
              },
            },
          },
          home: {
            type: "zone",
            zoneId: "draw",
          },
          visibility: {
            visibleTo: ["player-1"],
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
      allowedCardSetIds: ["main"],
    },
  ],
  boardTemplates: [
    {
      id: "square-template",
      name: "Square Template",
      layout: "square",
      boardFieldsSchema: {
        properties: {
          activeSpaceId: {
            type: "spaceId",
          },
          activeEdgeId: {
            type: "edgeId",
          },
          activeVertexId: {
            type: "vertexId",
          },
        },
      },
      spaceFieldsSchema: {
        properties: {
          terrain: {
            type: "enum",
            enums: ["grass", "water"],
          },
          focusEdgeId: {
            type: "edgeId",
            optional: true,
          },
        },
      },
      relationFieldsSchema: {
        properties: {
          cost: {
            type: "integer",
          },
          targetSpaceId: {
            type: "spaceId",
          },
        },
      },
      containerFieldsSchema: {
        properties: {
          anchorSpaceId: {
            type: "spaceId",
          },
          exitEdgeId: {
            type: "edgeId",
          },
        },
      },
      edgeFieldsSchema: {
        properties: {
          checkpointVertexId: {
            type: "vertexId",
          },
        },
      },
      vertexFieldsSchema: {
        properties: {
          entryEdgeId: {
            type: "edgeId",
          },
        },
      },
      spaces: [
        {
          id: "square-a",
          row: 0,
          col: 0,
          fields: {
            terrain: "grass",
            focusEdgeId: "square-edge:0,0::1,0",
          },
        },
        {
          id: "square-b",
          row: 0,
          col: 1,
          fields: {
            terrain: "water",
            focusEdgeId: "square-edge:1,0::1,1",
          },
        },
        {
          id: "square-c",
          row: 1,
          col: 0,
          fields: {
            terrain: "grass",
          },
        },
        {
          id: "square-d",
          row: 1,
          col: 1,
          fields: {
            terrain: "water",
          },
        },
      ],
      relations: [
        {
          typeId: "adjacent",
          fromSpaceId: "square-a",
          toSpaceId: "square-b",
          fields: {
            cost: 1,
            targetSpaceId: "square-c",
          },
        },
      ],
      containers: [
        {
          id: "square-slot",
          name: "Square Slot",
          host: { type: "space", spaceId: "square-d" },
          allowedCardSetIds: ["main"],
          fields: {
            anchorSpaceId: "square-d",
            exitEdgeId: "square-edge:1,0::1,1",
          },
        },
      ],
      edges: [
        {
          ref: { spaces: ["square-a", "square-b"] },
          fields: {
            checkpointVertexId: "square-vertex:1,1",
          },
        },
      ],
      vertices: [
        {
          ref: { spaces: ["square-a", "square-b", "square-c", "square-d"] },
          fields: {
            entryEdgeId: "square-edge:1,0::1,1",
          },
        },
      ],
    },
  ],
  boards: [
    {
      id: "square-board",
      name: "Square Board",
      layout: "square",
      scope: "shared",
      templateId: "square-template",
      fields: {
        activeSpaceId: "square-a",
        activeEdgeId: "square-edge:1,0::1,1",
        activeVertexId: "square-vertex:1,1",
      },
      spaces: [
        {
          id: "square-a",
          row: 0,
          col: 0,
          fields: {
            terrain: "water",
            focusEdgeId: "square-edge:0,0::0,1",
          },
        },
      ],
      relations: [
        {
          typeId: "adjacent",
          fromSpaceId: "square-c",
          toSpaceId: "square-d",
          fields: {
            cost: 2,
            targetSpaceId: "square-a",
          },
        },
      ],
      containers: [
        {
          id: "square-board-slot",
          name: "Square Board Slot",
          host: { type: "space", spaceId: "square-b" },
          allowedCardSetIds: ["main"],
          fields: {
            anchorSpaceId: "square-b",
            exitEdgeId: "square-edge:1,0::2,0",
          },
        },
      ],
      edges: [
        {
          ref: { spaces: ["square-c", "square-d"] },
          fields: {
            checkpointVertexId: "square-vertex:1,1",
          },
        },
      ],
      vertices: [
        {
          ref: { spaces: ["square-a", "square-b", "square-c", "square-d"] },
          fields: {
            entryEdgeId: "square-edge:1,1::2,1",
          },
        },
      ],
    },
    {
      id: "generic-board",
      name: "Generic Board",
      layout: "generic",
      scope: "shared",
      boardFieldsSchema: {
        properties: {
          homeSpaceId: {
            type: "spaceId",
          },
          note: {
            type: "string",
          },
        },
      },
      spaceFieldsSchema: {
        properties: {
          count: {
            type: "integer",
          },
        },
      },
      relationFieldsSchema: {
        properties: {
          anchorSpaceId: {
            type: "spaceId",
          },
        },
      },
      containerFieldsSchema: {
        properties: {
          label: {
            type: "string",
          },
        },
      },
      fields: {
        homeSpaceId: "generic-a",
        note: "ok",
      },
      spaces: [
        {
          id: "generic-a",
          fields: {
            count: 1,
          },
        },
        {
          id: "generic-b",
          fields: {
            count: 2,
          },
        },
      ],
      relations: [
        {
          typeId: "linked",
          fromSpaceId: "generic-a",
          toSpaceId: "generic-b",
          fields: {
            anchorSpaceId: "generic-b",
          },
        },
      ],
      containers: [
        {
          id: "generic-slot",
          name: "Generic Slot",
          host: { type: "space", spaceId: "generic-b" },
          allowedCardSetIds: ["main"],
          fields: {
            label: "tray",
          },
        },
      ],
    },
    {
      id: "hex-board",
      name: "Hex Board",
      layout: "hex",
      scope: "shared",
      boardFieldsSchema: {
        properties: {
          activeEdgeId: {
            type: "edgeId",
          },
          activeVertexId: {
            type: "vertexId",
          },
        },
      },
      spaceFieldsSchema: {
        properties: {
          label: {
            type: "string",
          },
          relatedVertexId: {
            type: "vertexId",
          },
        },
      },
      edgeFieldsSchema: {
        properties: {
          pairedEdgeId: {
            type: "edgeId",
          },
          anchorVertexId: {
            type: "vertexId",
          },
        },
      },
      vertexFieldsSchema: {
        properties: {
          anchorEdgeId: {
            type: "edgeId",
          },
          homeSpaceId: {
            type: "spaceId",
          },
        },
      },
      fields: {
        activeEdgeId: "hex-edge:1,-2,1::2,-1,-1",
        activeVertexId: "hex-vertex:1,-2,1",
      },
      spaces: [
        {
          id: "hex-a",
          q: 0,
          r: 0,
          fields: {
            label: "A",
            relatedVertexId: "hex-vertex:1,-2,1",
          },
        },
        {
          id: "hex-b",
          q: 1,
          r: 0,
          fields: {
            label: "B",
            relatedVertexId: "hex-vertex:1,-2,1",
          },
        },
        {
          id: "hex-c",
          q: 0,
          r: 1,
          fields: {
            label: "C",
            relatedVertexId: "hex-vertex:1,-2,1",
          },
        },
      ],
      edges: [
        {
          ref: { spaces: ["hex-a", "hex-b"] },
          fields: {
            pairedEdgeId: "hex-edge:1,-2,1::2,-1,-1",
            anchorVertexId: "hex-vertex:1,-2,1",
          },
        },
      ],
      vertices: [
        {
          ref: { spaces: ["hex-a", "hex-b", "hex-c"] },
          fields: {
            anchorEdgeId: "hex-edge:1,-2,1::2,-1,-1",
            homeSpaceId: "hex-a",
          },
        },
      ],
    },
  ],
  pieceTypes: [
    {
      id: "meeple",
      name: "Meeple",
      fieldsSchema: {
        properties: {
          stamina: {
            type: "integer",
          },
          state: {
            type: "enum",
            enums: ["ready", "spent"],
          },
          linkedCard: {
            type: "cardId",
          },
          assignedZone: {
            type: "zoneId",
            optional: true,
          },
        },
      },
    },
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
      ownerId: "player-2",
      fields: {
        stamina: 3,
        state: "ready",
        linkedCard: "ace",
        assignedZone: "draw",
      },
      visibility: {
        visibleTo: ["player-1"],
      },
      home: {
        type: "slot",
        host: {
          kind: "piece",
          id: "mat-alpha",
        },
        slotId: "worker-rest",
      },
    },
    {
      id: "worker-b",
      typeId: "meeple",
      ownerId: "player-2",
      home: {
        type: "space",
        boardId: "square-board",
        spaceId: "square-a",
      },
    },
  ],
  dieTypes: [
    {
      id: "d6",
      name: "D6",
      sides: 6,
      fieldsSchema: {
        properties: {
          owner: {
            type: "playerId",
          },
          resource: {
            type: "resourceId",
          },
          history: {
            type: "array",
            items: {
              type: "integer",
            },
          },
        },
      },
    },
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
      ownerId: "player-1",
      fields: {
        owner: "player-1",
        resource: "supply",
        history: [1, 6],
      },
      visibility: {
        visibleTo: ["player-2"],
      },
      home: {
        type: "slot",
        host: {
          kind: "die",
          id: "holder-a",
        },
        slotId: "staging",
      },
    },
    {
      id: "d6-b",
      typeId: "d6",
      ownerId: "player-1",
      home: {
        type: "container",
        boardId: "square-board",
        containerId: "square-board-slot",
      },
    },
  ],
  resources: [{ id: "supply", name: "Supply" }],
  setupOptions: [
    {
      id: "mode",
      name: "Mode",
      choices: [
        { id: "standard", label: "Standard" },
        { id: "draft", label: "Draft" },
      ],
    },
  ],
  setupProfiles: [
    {
      id: "standard-profile",
      name: "Standard",
      optionValues: {
        mode: "standard",
      },
    },
  ],
} as const);
