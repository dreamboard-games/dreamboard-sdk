export { defineGameContract } from "./authoring/contract";
export {
  createContractAuthoring,
  type BoundInputBuilders,
  type ContractAuthoring,
  type ContractWithPhases,
  type PhaseAuthoring,
} from "./authoring/contract-authoring";
export { defineEffect } from "./authoring/effect";
export { defineGame } from "./authoring/game";
export {
  defineCardAction,
  defineInteraction,
  defineInteractionRule,
} from "./authoring/interaction";
export { definePhase, defineStepPhase } from "./authoring/phase";
export {
  definePhaseStage,
  defineStage,
  defineStaticView,
  defineView,
} from "./authoring/view-stage";

export type {
  ReducerPhaseDefinition,
  ReducerViewDefinition,
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
