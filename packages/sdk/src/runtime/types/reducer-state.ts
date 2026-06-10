import type { GameView, PhaseName } from "#dreamboard/ui-contract";
import type {
  GameplayPromptOption,
  GameplaySnapshot as BaseGameplaySnapshot,
  PluginStateSnapshot as BasePluginStateSnapshot,
} from "./plugin-state.js";

type StageName = string;
type InteractionId = string;

export type GameplaySnapshot = BaseGameplaySnapshot<
  PhaseName,
  StageName,
  InteractionId
>;

export type PluginStateSnapshot = Omit<
  BasePluginStateSnapshot<GameView, PhaseName, StageName, InteractionId>,
  "gameplay"
> & {
  gameplay: GameplaySnapshot;
};

export type { GameplayPromptOption };
