import { handFeature } from "@dreamboard-games/sdk";
import { createGameHook } from "@dreamboard-games/sdk/react";
import type game from "../app/game";
import { HandRow } from "./components/hand-row";

export type Game = typeof game;
export const { GameProvider, useGame, Subscribe } = createGameHook<Game>()({
  coverage: { "passing.submit": HandRow, "playing.playCard": HandRow },
  features: (core) => ({ hand: handFeature(core) }),
});
