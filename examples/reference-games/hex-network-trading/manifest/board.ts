import { z, ref } from "@dreamboard-games/sdk/reducer";

export const boards = [
  {
    id: "frontier",
    name: "Stormtrail Frontier",
    layout: "hex",
    scope: "shared",
    orientation: "pointy",
  },
] as const;

const cellFieldsSchema = z.object({
  number: z.number().int().nullable(),
  resourceId: ref.resourceId().nullable(),
});

export const tileTypes = [
  {
    id: "northForest",
    name: "northForest",
    layout: "hex",
    cellFieldsSchema,
    cells: [
      {
        id: "cell",
        at: { q: 0, r: 0 },
        typeId: "pineForest",
        fields: { number: 5, resourceId: "timber" },
      },
    ],
  },
  {
    id: "northEastClay",
    name: "northEastClay",
    layout: "hex",
    cellFieldsSchema,
    cells: [
      {
        id: "cell",
        at: { q: 0, r: 0 },
        typeId: "clayFlats",
        fields: { number: 6, resourceId: "brick" },
      },
    ],
  },
  {
    id: "southEastFields",
    name: "southEastFields",
    layout: "hex",
    cellFieldsSchema,
    cells: [
      {
        id: "cell",
        at: { q: 0, r: 0 },
        typeId: "grainFields",
        fields: { number: 8, resourceId: "provisions" },
      },
    ],
  },
  {
    id: "southForest",
    name: "southForest",
    layout: "hex",
    cellFieldsSchema,
    cells: [
      {
        id: "cell",
        at: { q: 0, r: 0 },
        typeId: "pineForest",
        fields: { number: 9, resourceId: "timber" },
      },
    ],
  },
  {
    id: "southWestClay",
    name: "southWestClay",
    layout: "hex",
    cellFieldsSchema,
    cells: [
      {
        id: "cell",
        at: { q: 0, r: 0 },
        typeId: "clayFlats",
        fields: { number: 4, resourceId: "brick" },
      },
    ],
  },
  {
    id: "northWestFields",
    name: "northWestFields",
    layout: "hex",
    cellFieldsSchema,
    cells: [
      {
        id: "cell",
        at: { q: 0, r: 0 },
        typeId: "grainFields",
        fields: { number: 10, resourceId: "provisions" },
      },
    ],
  },
  {
    id: "centralBarrens",
    name: "centralBarrens",
    layout: "hex",
    cellFieldsSchema,
    cells: [
      {
        id: "cell",
        at: { q: 0, r: 0 },
        typeId: "barrens",
        fields: { number: null, resourceId: null },
      },
    ],
  },
] as const;

export const tileSeeds = [
  {
    id: "northForest",
    typeId: "northForest",
    home: {
      type: "board",
      boardId: "frontier",
      layout: "hex",
      q: 0,
      r: -1,
      rotation: 0,
    },
  },
  {
    id: "northEastClay",
    typeId: "northEastClay",
    home: {
      type: "board",
      boardId: "frontier",
      layout: "hex",
      q: 1,
      r: -1,
      rotation: 0,
    },
  },
  {
    id: "southEastFields",
    typeId: "southEastFields",
    home: {
      type: "board",
      boardId: "frontier",
      layout: "hex",
      q: 1,
      r: 0,
      rotation: 0,
    },
  },
  {
    id: "southForest",
    typeId: "southForest",
    home: {
      type: "board",
      boardId: "frontier",
      layout: "hex",
      q: 0,
      r: 1,
      rotation: 0,
    },
  },
  {
    id: "southWestClay",
    typeId: "southWestClay",
    home: {
      type: "board",
      boardId: "frontier",
      layout: "hex",
      q: -1,
      r: 1,
      rotation: 0,
    },
  },
  {
    id: "northWestFields",
    typeId: "northWestFields",
    home: {
      type: "board",
      boardId: "frontier",
      layout: "hex",
      q: -1,
      r: 0,
      rotation: 0,
    },
  },
  {
    id: "centralBarrens",
    typeId: "centralBarrens",
    home: {
      type: "board",
      boardId: "frontier",
      layout: "hex",
      q: 0,
      r: 0,
      rotation: 0,
    },
  },
] as const;
