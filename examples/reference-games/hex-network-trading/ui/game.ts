import {
  boardFeature,
  dragFeature,
  panZoomFeature,
} from "@dreamboard-games/sdk";
import type {
  Card,
  CoreInstance,
  FeatureContext,
  GameSnapshot,
  IdOf,
  InteractionKey as SDKInteractionKey,
  Player,
  SeatCardId,
  ViewOf,
} from "@dreamboard-games/sdk";
import type { CardGestureOptions } from "@dreamboard-games/sdk/react";
import { createGameHook } from "@dreamboard-games/sdk/react";
import type game from "../app/game";
import { StormtrailBoard } from "./App";
import { Form } from "./interaction-routes";

export type Game = typeof game;
type Definition = typeof game;
function features(
  core: CoreInstance<Definition>,
  context: FeatureContext<Definition>,
) {
  return {
    board: boardFeature(core, context),
    drag: dragFeature(core, context),
    viewport: panZoomFeature(core, context, {
      initial: { x: 0, y: 0, scale: 0.9 },
      minScale: 0.65,
      maxScale: 1.35,
    }),
  };
}
type EnabledFeatures = ReturnType<typeof features>;
export type GameModel = GameSnapshot<Definition, EnabledFeatures>;
export type GameCard = Card<Definition, EnabledFeatures>;
export type CardId = SeatCardId<Definition>;
export type ZoneId = IdOf<Definition, "zoneId">;
export type GamePlayer = Player<Definition>;
export type GameView = ViewOf<Definition>;
export type InteractionKey = SDKInteractionKey<Definition>;
export type CardDrag = CardGestureOptions<Definition>["drag"];
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
  SDKInteractionKey<Game>,
  | typeof StormtrailBoard
  | typeof Form
  | readonly (typeof StormtrailBoard | typeof Form)[]
>;
export const {
  GameProvider,
  useGame,
  Subscribe,
  useCardGesture,
  useActiveCard,
  useDropArea,
  useDragOverlay,
} = createGameHook<Game>()({
  features,
});
