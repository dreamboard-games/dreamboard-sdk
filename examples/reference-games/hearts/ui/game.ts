import {
  handFeature,
  dragFeature,
  originsFeature,
  shortcutsFeature,
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
    shortcuts: shortcutsFeature(core, context),
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
  useGameShortcuts,
  useShortcutTarget,
  useShortcutHints,
  useDropArea,
  useDragOverlay,
} = createGameHook<Game>()({
  features,
});
export { GameProvider } from "./components/dreamboard/game-provider";
