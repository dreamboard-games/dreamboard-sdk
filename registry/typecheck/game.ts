import {
  boardFeature,
  dragFeature,
  handFeature,
  originsFeature,
  panZoomFeature,
} from "@dreamboard-games/sdk";
import { createGameHook } from "@dreamboard-games/sdk/react";
/** Test-owned all-features binding; installed items use the authored game's hook. */
export const {
  useGame,
  GameProvider: SDKGameProvider,
  useCardGesture,
  useDropArea,
  useDragOverlay,
} = createGameHook<unknown>()({
  features: (game, context) => ({
    board: boardFeature(game, context),
    drag: dragFeature(game, context),
    hand: handFeature(game),
    origins: originsFeature(game),
    panZoom: panZoomFeature(game, context),
  }),
  debug: false,
});
export { GameProvider } from "../items/game-provider";
