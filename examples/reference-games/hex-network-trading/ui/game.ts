import {
  boardFeature,
  panZoomFeature,
  type ViewOf,
  type InteractionKey,
} from "@dreamboard-games/sdk";
import { createGameHook } from "@dreamboard-games/sdk/react";
import type game from "../app/game";
import { StormtrailBoard } from "./App";
import { Form } from "./interaction-routes";

export type Game = typeof game;
export type GameView = ViewOf<Game>;
export const coverage = {
  "setupCamp.placeStartingCamp": StormtrailBoard,
  "setupTrail.placeStartingTrail": StormtrailBoard,
  "roll.rollDice": Form,
  "discardBarrier.discardSupplies": Form,
  "moveBandits.moveBandits": [StormtrailBoard, Form],
  "main.buildTrail": StormtrailBoard,
  "main.buildCamp": StormtrailBoard,
  "main.tradeWithSupplyDepot": Form,
  "main.offerTrade": Form,
  "main.endTurn": Form,
  "pendingTrade.acceptTrade": Form,
  "pendingTrade.rejectTrade": Form,
} satisfies Record<
  InteractionKey<Game>,
  | typeof StormtrailBoard
  | typeof Form
  | readonly (typeof StormtrailBoard | typeof Form)[]
>;
export const { GameProvider, useGame, Subscribe } = createGameHook<Game>()({
  coverage,
  features: (core, context) => ({
    board: boardFeature(core, context),
    viewport: panZoomFeature(core, context, {
      initial: { x: 0, y: 0, scale: 0.9 },
      minScale: 0.65,
      maxScale: 1.35,
    }),
  }),
});
