import { handFeature, dragFeature } from "@dreamboard-games/sdk";
import { createGameHook } from "@dreamboard-games/sdk/react";
import type game from "../app/game";
import { HandRow } from "./components/hand-row";

export type Game = typeof game;
export const { GameProvider, useGame, Subscribe, useCardDrag, useBoardDrop } =
  createGameHook<Game>()({
    coverage: { "passing.submit": HandRow, "playing.playCard": HandRow },
    features: (core, context) => ({
      hand: handFeature(core),
      drag: dragFeature(core, context),
    }),
  });
