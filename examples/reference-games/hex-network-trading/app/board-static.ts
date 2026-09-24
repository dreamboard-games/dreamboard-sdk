import { staticBoards } from "./manifest";
import { stormtrail } from "./game-model";

export const boardStatic = stormtrail.views.static({
  project: () => {
    return staticBoards.hex.frontier;
  },
});
