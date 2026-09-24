import { hexagon } from "@dreamboard-games/sdk/reducer";

export const boards = [
  {
    id: "frontier",
    name: "Stormtrail Frontier",
    layout: "hex",
    scope: "shared",
    orientation: "pointy",
    shape: hexagon({ radius: 1 }),
    spaces: {
      "0,-1": { id: "northForest", typeId: "pineForest" },
      "1,-1": { id: "northEastClay", typeId: "clayFlats" },
      "1,0": { id: "southEastFields", typeId: "grainFields" },
      "0,1": { id: "southForest", typeId: "pineForest" },
      "-1,1": { id: "southWestClay", typeId: "clayFlats" },
      "-1,0": { id: "northWestFields", typeId: "grainFields" },
      "0,0": { id: "centralBarrens", typeId: "barrens" },
    },
  },
] as const;
