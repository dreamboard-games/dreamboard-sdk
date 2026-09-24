// Barrel for the split spec/ modules. Re-exports exactly the names the
// original monolithic spec.ts exported, so importers of "./spec",
// "./model/spec", or "../model/spec" are unaffected. Internal-only helpers
// (e.g. BivariantCallback, PhaseDefinitionCommon) are intentionally not
// re-exported here.

export type {
  StaticViewQueries,
  PhaseEnterContext,
  ActionContext,
  ValidationIssue,
  ReadHelpers,
  RandomHelpers,
  MutationHelpers,
  PhaseEnterArgs,
  ActorSelectorArgs,
  ActorSelection,
  ActorSelector,
  ScopedPhaseState,
} from "./spec/runtime-args";

export { FrameworkErrorCodes, type FrameworkErrorCode } from "./error-codes";

export type {
  InputCollectorKind,
  TargetKind,
  BoardInputCollectorKind,
  CardInputCollectorMeta,
  BoardInputCollectorMeta,
  PromptInputCollectorMeta,
  RngInputCollectorMeta,
  InputCollectorMetaForKind,
  InputSelectionDescriptor,
  InputDomainResolverDescriptor,
  InputDomainDependencyCase,
  EagerInputDomainDependencies,
  LazyInputDomainDependencies,
  CardTargetDomainDescriptor,
  ResolvedCardTargetDomainDescriptor,
  LazyCardTargetDomainDescriptor,
  BoardTargetDomainDescriptor,
  ResolvedBoardTargetDomainDescriptor,
  LazyBoardTargetDomainDescriptor,
  ResourceMapDomainDescriptor,
  BoundedNumberDomainDescriptor,
  ChoiceDomainDescriptor,
  ChoiceListDomainDescriptor,
  InputDomainDescriptor,
  CollectorState,
  InputCollector,
  ParamsOf,
  ClientParamsOf,
} from "./spec/inputs";

export type {
  SimultaneousSubmission,
  SimultaneousResolveArgs,
  SimultaneousSubmitSpec,
} from "./spec/simultaneous";

export type {
  InteractionReduceInput,
  InteractionValidateArgs,
  InteractionReduceArgs,
  InteractionAvailabilityArgs,
  InteractionRuleValidationResult,
  InteractionRule,
  InteractionCommitPolicy,
  InteractionKind,
  InteractionToArgs,
  InteractionSpec,
  AnyInteractionSpec,
  InteractionMap,
  PhaseZoneList,
} from "./spec/interactions";

export type {
  AutoPhaseDefinition,
  PlayerPhaseDefinition,
  SimultaneousPlayerPhaseDefinition,
  PhaseDefinition,
} from "./spec/phases";

export type {
  EmptyViewDefinition,
  PlayerViewDefinition,
  SharedViewDefinition,
  StaticViewDefinition,
} from "./spec/views";
