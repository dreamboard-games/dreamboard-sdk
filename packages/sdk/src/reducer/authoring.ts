export { defineGameContract } from "./authoring/contract";
export type {
  DefinedGameContract,
  ReducerGameContractInput,
} from "./authoring/contract";
export {
  createContractAuthoring,
  type BoundInputBuilders,
  type BoundTargetPredicate,
  type BoundViewBuilders,
  type ContractAuthoring,
  type ContractTypes,
  type ContractWithPhases,
  type GameAuthoring,
  type PhaseAuthoring,
  type PhaseTypes,
} from "./authoring/contract-authoring";
export { defineEffect } from "./authoring/effect";
export { createGame, defineGame } from "./authoring/game";
export {
  defineCardAction,
  defineInteraction,
  defineInteractionRule,
} from "./authoring/interaction";
export { definePhase, defineStepPhase } from "./authoring/phase";
export {
  defineEmptyView,
  definePlayerView,
  definePhaseStage,
  defineSharedView,
  defineStage,
  defineStaticView,
} from "./authoring/view-stage";

export type {
  ReducerPhaseDefinition,
  ReducerPlayerViewDefinition,
  ReducerSharedViewDefinition,
} from "./authoring/types";

export type {
  GameStateOf,
  ErrorCodeOfContract,
  InitialStateCallbacks,
  ManifestOf,
  PhaseMapOf,
  ReducerGameContract,
  ReducerGameDefinition,
} from "./model";
