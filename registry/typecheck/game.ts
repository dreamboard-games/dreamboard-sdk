import {
  boardFeature,
  handFeature,
  panZoomFeature,
} from "@dreamboard-games/sdk";
import { createGameHook } from "@dreamboard-games/sdk/react";
/** Test-owned all-features binding; installed items use the authored game's hook. */
export const { useGame, GameProvider } = createGameHook<unknown>()({
  features: (game, context) => ({
    board: boardFeature(game, context),
    hand: handFeature(game),
    panZoom: panZoomFeature(game, context),
  }),
  debug: false,
});
