import {
  boardFeature,
  dragFeature,
  handFeature,
  originsFeature,
  shortcutsFeature,
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
  ShortcutTarget as SDKShortcutTarget,
  ShortcutZoneTarget as SDKShortcutZoneTarget,
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
    shortcuts: shortcutsFeature(core, context),
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
export type ShortcutTarget = SDKShortcutTarget<Definition>;
export type ShortcutZoneTarget = SDKShortcutZoneTarget<Definition>;
export type CardDrag = CardGestureOptions<Definition>["drag"];
export const {
  useGame,
  GameProvider: SDKGameProvider,
  useCardGesture,
  useActiveCard,
  useGameShortcuts,
  useShortcutTarget,
  useShortcutHints,
  useDropArea,
  useDragOverlay,
} = createGameHook<unknown>()({
  features,
  debug: false,
});
export { GameProvider } from "../items/game-provider";
