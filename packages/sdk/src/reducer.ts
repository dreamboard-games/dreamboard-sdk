export {
  type BoundInputBuilders,
  type BoundTargetPredicate,
  type ContractTypes,
  type GameAuthoring,
  type PhaseAuthoring,
  type PhaseTypes,
} from "./reducer/authoring/contract-authoring";
export { createGame } from "./reducer/authoring/game";
export type { ReducerGameDefinition } from "./reducer/model";
export { gameEvent } from "./reducer/game-event";
export type {
  GameEvent,
  GameEventDetail,
  InteractionRule,
  ReducerValidationResult,
  SystemActionEvent,
  ValidationIssue,
} from "./reducer/model";
export {
  many,
  type BoardTargetPredicate,
  type CardTargetPredicate,
  type ChoiceOptionsFactory,
  type ChoiceTargetOption,
  type ChoiceTargetPredicate,
  type ManyOptions,
  type PlayerBoardSpaceTarget,
  type TargetContext,
  type TargetPredicate,
  type TargetPredicateArgs,
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
export type {
  ReducerTransaction,
  ReducerTransactionOutcome,
  RotatePlayerZoneArgs,
} from "./reducer/transaction";
export {
  asPlayerId,
  boardRef,
  boardRefKey,
  boardRefSchema,
  isPerPlayerBoardRef,
  isPlayerId,
  isSharedBoardRef,
  parseBoardRefKey,
  perPlayerBoardRef,
  sharedBoardRef,
  type BoardRef,
  type PerPlayerBoardRef,
  type PlayerId,
  type SharedBoardRef,
} from "./reducer/per-player";
export { memoize } from "./reducer/memoize";
// Flat `getX` table helpers were removed from the public surface in favour
// of the opinionated `q.*` namespace returned by `createTableQueries` /
// `createStateQueries` (also injected into every reducer callback as `q`).
export { assertCardAllowedInContainer } from "./reducer/table";
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

export { compileManifest } from "./reducer/manifest/compiler";
export type {
  AuthoredManifest,
  CompiledManifest,
  ManifestIdsOf,
  ManifestTable,
} from "./reducer/manifest/types";

export {
  hexagon,
  rectangle,
  ring,
  spiral,
  fromCoordinates,
} from "./shared/hex-board";

/** Public worker ABI and wire schemas. */
export {
  assertReducerBundleContract,
  REDUCER_CONTRACT_VERSION,
} from "./shared/worker-contract";
export type {
  MaybePromise,
  ReducerBundleContract,
} from "./shared/worker-contract";
export type * as ReducerWire from "./shared/runtime-types";
export * as ReducerWireZod from "./shared/runtime-schema";
export { materializeManifestTable } from "./reducer/manifest/materialize";

export {
  defineTopologyManifest,
  type TypedTopologyManifest,
} from "./reducer/manifest/authoring.js";

export type { GameTopologyManifest } from "./shared/domain/manifest.js";
export type { SquareBoardSpec } from "./shared/domain/contracts.js";
