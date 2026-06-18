export {
  defineEffect,
  defineCardAction,
  createContractAuthoring,
  defineGame,
  defineGameContract,
  defineInteraction,
  defineInteractionRule,
  definePhase,
  definePhaseStage,
  defineStepPhase,
  defineStage,
  defineStaticView,
  defineView,
  type ReducerGameContract,
  type ReducerGameDefinition,
  type BoundInputBuilders,
  type ContractAuthoring,
  type ContractWithPhases,
  type InitialStateCallbacks,
  type PhaseAuthoring,
  type ReducerPhaseDefinition,
  type ReducerViewDefinition,
} from "./reducer/authoring";
export { gameEvent } from "./reducer/game-event";
export type {
  ErrorCodeOfContract,
  GameEvent,
  GameEventDetail,
  GameStateOf,
  ReducerAcceptOptions,
  InteractionRule,
  PhaseMapOf,
  ReducerValidationResult,
  SystemActionEvent,
  ValidationIssue,
} from "./reducer/model";
export {
  boardInput,
  boardTarget,
  cardInput,
  cardTarget,
  choiceTarget,
  defineInputs,
  formInput,
  many,
  promptInput,
  rngInput,
  type BoardTargetBuilder,
  type BoardTargetPredicate,
  type BoardTargetRule,
  type BoundTargetRule,
  type CardTargetBuilder,
  type CardTargetPredicate,
  type CardTargetRule,
  type ChoiceOptionsFactory,
  type ChoiceTargetBuilder,
  type ChoiceTargetOption,
  type ChoiceTargetPredicate,
  type ChoiceTargetRule,
  type DependencyValues,
  type DefinedInputs,
  type InputFieldRef,
  type ManyOptions,
  type PlayerBoardSpaceTarget,
  type TargetContext,
  type TargetPredicate,
  type TargetPredicateArgs,
  type TargetRule,
  type TargetRuleBuilder,
} from "./reducer/inputs";
export {
  normalizeCommandParams,
  sparseCounts,
  sparseMap,
  type SparseCounts,
  type SparseMap,
} from "./reducer/schema-helpers";
export { FrameworkErrorCodes } from "./reducer/model";
export { createReducerBundle } from "./reducer/bundle";
export type { ReducerBundle, ReducerBundleOptions } from "./reducer/bundle";
export { noopDiagnosticsSink } from "./reducer/diagnostics";
export type {
  DispatchTraceSummaryEntry,
  ReducerDiagnosticEvent,
  ReducerDiagnosticsSink,
} from "./reducer/diagnostics";
export {
  contractFingerprint,
  type ContractFingerprint,
} from "./reducer/contract-fingerprint";
export {
  StaleContractArtifactError,
  isStaleContractArtifactError,
  type StaleContractArtifactErrorOptions,
  type StaleContractArtifactKind,
} from "./reducer/stale-contract-artifact-error";
export { pipe, type Op } from "./reducer/compose";
export {
  createReducerEdit,
  createReducerTransaction,
  type ReducerEdit,
  type ReducerTransaction,
  type RotatePlayerZoneArgs,
} from "./reducer/transaction";
export {
  asPlayerId,
  boardRef,
  boardRefKey,
  boardRefSchema,
  isPerPlayer,
  isPerPlayerBoardRef,
  isPlayerId,
  isSharedBoardRef,
  parseBoardRefKey,
  perPlayer,
  perPlayerBoardRef,
  perPlayerEntries,
  perPlayerGet,
  perPlayerHas,
  perPlayerKeys,
  perPlayerMap,
  perPlayerRequire,
  perPlayerSchema,
  perPlayerSet,
  perPlayerSize,
  perPlayerValues,
  sharedBoardRef,
  type BoardRef,
  type PerPlayer,
  type PerPlayerBoardRef,
  type PerPlayerSchemaOptions,
  type PlayerId,
  type SharedBoardRef,
} from "./reducer/per-player";
export {
  createReducerOps,
  type ReducerOps,
  type ReducerStateBase,
} from "./reducer/ops";
export {
  defineDerived,
  createDerivedResolver,
  type DerivedDefinition,
  type DerivedResolver,
} from "./reducer/derived";
// Flat `getX` table helpers were removed from the public surface in favour
// of the opinionated `q.*` namespace returned by `createTableQueries` /
// `createStateQueries` (also injected into every reducer callback as `q`).
export {
  assertCardAllowedInContainer,
  setActivePlayers,
} from "./reducer/table";
export {
  createTableQueries,
  createStateQueries,
} from "./reducer/table-queries";
export type {
  ReducerAccept,
  ReducerReject,
  ReducerResult,
  TableQueries,
  TableQueriesOfState,
  GameOutcome,
  OutcomeResult,
  OutcomeScoreComponent,
  OutcomeStanding,
  OutcomeTieBreak,
} from "./reducer/model";
