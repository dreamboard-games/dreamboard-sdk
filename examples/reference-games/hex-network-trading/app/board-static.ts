import type { GameContract } from "./game-contract";
import { defineStaticView } from "@dreamboard-games/sdk/reducer";
import { staticBoards } from "../shared/manifest-runtime";

export const boardStatic = defineStaticView<GameContract>()({
  project: () => {
    return staticBoards.hex.frontier;
  },
});
