export const boardTemplates = [
  {
    id: "stormtrail-map",
    name: "Stormtrail Frontier",
    layout: "hex",
    orientation: "pointy-top",
    spaces: [
      { id: "northForest", q: 0, r: -1, typeId: "pineForest" },
      { id: "northEastClay", q: 1, r: -1, typeId: "clayFlats" },
      { id: "southEastFields", q: 1, r: 0, typeId: "grainFields" },
      { id: "southForest", q: 0, r: 1, typeId: "pineForest" },
      { id: "southWestClay", q: -1, r: 1, typeId: "clayFlats" },
      { id: "northWestFields", q: -1, r: 0, typeId: "grainFields" },
      { id: "centralBarrens", q: 0, r: 0, typeId: "barrens" },
    ],
  },
] as const;

export const boards = [
  {
    id: "frontier",
    name: "Stormtrail Frontier",
    layout: "hex",
    scope: "shared",
    templateId: "stormtrail-map",
  },
] as const;
