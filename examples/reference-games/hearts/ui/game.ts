import {
  handFeature,
  dragFeature,
  originsFeature,
} from "@dreamboard-games/sdk";
import { createGameHook } from "@dreamboard-games/sdk/react";
import type game from "../app/game";
import { HandRow } from "./components/hand-row";

export type Game = typeof game;
export const {
  GameProvider: SDKGameProvider,
  useGame,
  Subscribe,
  useCardGesture,
  useDropArea,
  useDragOverlay,
} = createGameHook<Game>()({
  coverage: { "passing.submit": HandRow, "playing.playCard": HandRow },
  features: (core, context) => ({
    hand: handFeature(core),
    drag: dragFeature(core, context),
    origins: originsFeature(core),
  }),
});
export { GameProvider } from "./components/dreamboard/game-provider";
