import {
  handFeature,
  dragFeature,
  originsFeature,
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
import { HandRow } from "./components/hand-row";

export type Game = typeof game;
type Definition = typeof game;
function features(
  core: CoreInstance<Definition>,
  context: FeatureContext<Definition>,
) {
  return {
    hand: handFeature(core),
    drag: dragFeature(core, context),
    origins: originsFeature(core),
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
  "passing.submit": HandRow,
  "playing.playCard": HandRow,
} satisfies Record<InteractionKey, typeof HandRow>;
export const {
  GameProvider: SDKGameProvider,
  useGame,
  Subscribe,
  useCardGesture,
  useActiveCard,
  useDropArea,
  useDragOverlay,
} = createGameHook<Game>()({
  features,
});
export { GameProvider } from "./components/dreamboard/game-provider";
