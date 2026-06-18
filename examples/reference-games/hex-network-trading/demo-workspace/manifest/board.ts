export const boardTemplates = [
  {
    id: "star-frontier",
    name: "Frontier Trails Frontier",
    layout: "hex",
    orientation: "pointy-top",
    edgeFieldsSchema: {
      properties: {
        relayIndex: {
          type: "integer",
          optional: true,
        },
      },
    },
    // Standard 19-hex Frontier Trails layout in axial coordinates
    // Ring 0 (center): 1 hex
    // Ring 1: 6 hexes
    // Ring 2: 12 hexes
    spaces: [
      // Center
      {
        id: "h-0-0",
        q: 0,
        r: 0,
        typeId: "land",
      },

      // Ring 1 (6 hexes)
      {
        id: "h-1-0",
        q: 1,
        r: -1,
        typeId: "land",
      },
      {
        id: "h-1-1",
        q: 1,
        r: 0,
        typeId: "land",
      },
      {
        id: "h-1-2",
        q: 0,
        r: 1,
        typeId: "land",
      },
      {
        id: "h-1-3",
        q: -1,
        r: 1,
        typeId: "land",
      },
      {
        id: "h-1-4",
        q: -1,
        r: 0,
        typeId: "land",
      },
      {
        id: "h-1-5",
        q: 0,
        r: -1,
        typeId: "land",
      },

      // Ring 2 (12 hexes)
      {
        id: "h-2-0",
        q: 2,
        r: -2,
        typeId: "land",
      },
      {
        id: "h-2-1",
        q: 2,
        r: -1,
        typeId: "land",
      },
      {
        id: "h-2-2",
        q: 2,
        r: 0,
        typeId: "land",
      },
      {
        id: "h-2-3",
        q: 1,
        r: 1,
        typeId: "land",
      },
      {
        id: "h-2-4",
        q: 0,
        r: 2,
        typeId: "land",
      },
      {
        id: "h-2-5",
        q: -1,
        r: 2,
        typeId: "land",
      },
      {
        id: "h-2-6",
        q: -2,
        r: 2,
        typeId: "land",
      },
      {
        id: "h-2-7",
        q: -2,
        r: 1,
        typeId: "land",
      },
      {
        id: "h-2-8",
        q: -2,
        r: 0,
        typeId: "land",
      },
      {
        id: "h-2-9",
        q: -1,
        r: -1,
        typeId: "land",
      },
      {
        id: "h-2-10",
        q: 0,
        r: -2,
        typeId: "land",
      },
      {
        id: "h-2-11",
        q: 1,
        r: -2,
        typeId: "land",
      },

      // Ring 3 (18 borderland hexes — surrounds the frontier)
      {
        id: "o-0",
        q: 3,
        r: -3,
        typeId: "borderland",
      },
      {
        id: "o-1",
        q: 3,
        r: -2,
        typeId: "borderland",
      },
      {
        id: "o-2",
        q: 3,
        r: -1,
        typeId: "borderland",
      },
      {
        id: "o-3",
        q: 3,
        r: 0,
        typeId: "borderland",
      },
      {
        id: "o-4",
        q: 2,
        r: 1,
        typeId: "borderland",
      },
      {
        id: "o-5",
        q: 1,
        r: 2,
        typeId: "borderland",
      },
      {
        id: "o-6",
        q: 0,
        r: 3,
        typeId: "borderland",
      },
      {
        id: "o-7",
        q: -1,
        r: 3,
        typeId: "borderland",
      },
      {
        id: "o-8",
        q: -2,
        r: 3,
        typeId: "borderland",
      },
      {
        id: "o-9",
        q: -3,
        r: 3,
        typeId: "borderland",
      },
      {
        id: "o-10",
        q: -3,
        r: 2,
        typeId: "borderland",
      },
      {
        id: "o-11",
        q: -3,
        r: 1,
        typeId: "borderland",
      },
      {
        id: "o-12",
        q: -3,
        r: 0,
        typeId: "borderland",
      },
      {
        id: "o-13",
        q: -2,
        r: -1,
        typeId: "borderland",
      },
      {
        id: "o-14",
        q: -1,
        r: -2,
        typeId: "borderland",
      },
      {
        id: "o-15",
        q: 0,
        r: -3,
        typeId: "borderland",
      },
      {
        id: "o-16",
        q: 1,
        r: -3,
        typeId: "borderland",
      },
      {
        id: "o-17",
        q: 2,
        r: -3,
        typeId: "borderland",
      },
    ],
    edges: [
      {
        ref: { spaces: ["h-2-11", "o-16"] },
        typeId: "relay",
        fields: { relayIndex: 0 },
      },
      {
        ref: { spaces: ["h-2-11", "o-17"] },
        typeId: "relay",
        fields: { relayIndex: 1 },
      },
      {
        ref: { spaces: ["h-2-1", "o-1"] },
        typeId: "relay",
        fields: { relayIndex: 2 },
      },
      {
        ref: { spaces: ["h-2-3", "o-4"] },
        typeId: "relay",
        fields: { relayIndex: 3 },
      },
      {
        ref: { spaces: ["h-2-4", "o-5"] },
        typeId: "relay",
        fields: { relayIndex: 4 },
      },
      {
        ref: { spaces: ["h-2-5", "o-8"] },
        typeId: "relay",
        fields: { relayIndex: 5 },
      },
      {
        ref: { spaces: ["h-2-7", "o-10"] },
        typeId: "relay",
        fields: { relayIndex: 6 },
      },
      {
        ref: { spaces: ["h-2-8", "o-13"] },
        typeId: "relay",
        fields: { relayIndex: 7 },
      },
      {
        ref: { spaces: ["h-2-9", "o-14"] },
        typeId: "relay",
        fields: { relayIndex: 8 },
      },
    ],
  },
] as const;

export const boards = [
  {
    id: "frontier",
    name: "Frontier Trails Frontier",
    layout: "hex",
    scope: "shared",
    templateId: "star-frontier",
  },
] as const;
