/**
 * Internal authoring barrel for the SDK's own test suite.
 *
 * Re-exports the public `/reducer` facade plus the unbound, contract-first
 * helpers that were removed from it. Nothing here is part of the package
 * export map. Tests migrate to `createGame` incrementally; when the last one
 * does, this file and the unbound helpers go with it.
 */
export * from "../reducer";
export {
  createContractAuthoring,
  defineEmptyView,
  defineGame,
  defineGameContract,
  defineInteraction,
  defineInteractionRule,
  definePhase,
  definePlayerView,
  defineSharedView,
  defineStaticView,
  type ReducerPhaseDefinition,
  type ReducerPlayerViewDefinition,
  type ReducerSharedViewDefinition,
} from "./authoring";
export { defineGameDefinition } from "./authoring/game";
export type {
  ErrorCodeOfContract,
  GameStateOf,
  InitialStateCallbacks,
  PhaseMapOf,
  ReducerAcceptOptions,
  ReducerGameContract,
} from "./model";
export {
  boardInput,
  boardTarget,
  cardInput,
  cardTarget,
  choiceTarget,
  formInput,
  promptInput,
  rngInput,
  type BoardTargetBuilder,
  type BoardTargetRule,
  type BoundTargetRule,
  type CardTargetBuilder,
  type CardTargetRule,
  type ChoiceTargetBuilder,
  type ChoiceTargetRule,
  type TargetRule,
  type TargetRuleBuilder,
} from "./inputs";
export {
  createReducerEdit,
  createReducerTransaction,
  type ReducerEdit,
} from "./transaction";
