export { defineGameContract } from "./authoring/contract";
export type {
  DefinedGameContract,
  ReducerGameContractInput,
} from "./authoring/contract";
export {
  createContractAuthoring,
  type BoundInputBuilders,
  type BoundTargetPredicate,
  type ContractAuthoring,
  type ContractTypes,
  type ContractWithPhases,
  type GameAuthoring,
  type PhaseAuthoring,
  type PhaseTypes,
} from "./authoring/contract-authoring";
export { createGame, defineGame } from "./authoring/game";
export {
  defineInteraction,
  defineInteractionRule,
} from "./authoring/interaction";
export { definePhase } from "./authoring/phase";
export { defineView } from "./authoring/views";

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
