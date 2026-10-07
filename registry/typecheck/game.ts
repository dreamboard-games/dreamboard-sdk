import {
  boardFeature,
  dragFeature,
  handFeature,
  originsFeature,
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
/** Test-owned all-features binding; installed items use the authored game's hook. */
type Definition = unknown;
function features(
  core: CoreInstance<Definition>,
  context: FeatureContext<Definition>,
) {
  return {
    board: boardFeature(core, context),
    drag: dragFeature(core, context),
    hand: handFeature(core),
    origins: originsFeature(core),
    panZoom: panZoomFeature(core, context),
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
export const {
  useGame,
  GameProvider: SDKGameProvider,
  useCardGesture,
  useActiveCard,
  useDropArea,
  useDragOverlay,
} = createGameHook<unknown>()({
  features,
  debug: false,
});
export { GameProvider } from "../items/game-provider";
