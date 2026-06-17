import type { GameView, PhaseName } from "#dreamboard/ui-contract";
import type {
  GameplayPromptOption,
  GameplaySnapshot as BaseGameplaySnapshot,
  PluginRuntimeProjection as BasePluginRuntimeProjection,
} from "./plugin-state.js";

type StageName = string;
type InteractionId = string;

export type GameplaySnapshot = BaseGameplaySnapshot<
  PhaseName,
  StageName,
  InteractionId
>;

export type PluginRuntimeProjection = Omit<
  BasePluginRuntimeProjection<GameView, PhaseName, StageName, InteractionId>,
  "gameplay"
> & {
  gameplay: GameplaySnapshot;
};

export type { GameplayPromptOption };
