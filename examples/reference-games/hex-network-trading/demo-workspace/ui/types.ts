import type { GameView } from "#dreamboard/ui-contract";
import type { PlayerId } from "../shared/manifest-contract";
import type { FrontierSurfaces as DefinedFrontierSurfaces } from "./surfaces";

export type PlayerInfoById = ReadonlyMap<
  PlayerId,
  { readonly color?: string; readonly name?: string }
>;

export type FrontierSurfaces = DefinedFrontierSurfaces;
export type FrontierBoardSurface = FrontierSurfaces["frontierBoard"];
export type CharterHandSurface = FrontierSurfaces["charterHand"];

export type FrontierInteractionContext = {
  diceValues: GameView["diceValues"];
  pendingTrade: GameView["pendingTrade"];
};
