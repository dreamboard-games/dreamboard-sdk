// Barrel for the split spec/ modules. Re-exports exactly the names the
// original monolithic spec.ts exported, so importers of "./spec",
// "./model/spec", or "../model/spec" are unaffected. Internal-only helpers
// (e.g. BivariantCallback, PhaseDefinitionCommon) are intentionally not
// re-exported here.

export type {
  StaticViewQueries,
  ContinuationSourceKind,
  ResumableEffectKind,
  ContinuationKind,
  RollDieContinuationResponse,
  ShuffleSharedZoneContinuationResponse,
  ShufflePlayerZoneContinuationResponse,
  EffectContinuationResponse,
  EffectContinuationInput,
  ContinuationInput,
  ContinuationInputForSource,
  PhaseEnterContext,
  ActionContext,
  ValidationIssue,
  RuntimeHelpers,
  RandomHelpers,
  MutationRuntimeHelpers,
  PhaseEnterArgs,
  ActorSelectorArgs,
  ActorSelection,
  ActorSelector,
  ContinuationReduceArgs,
  ScopedPhaseState,
  ContinuationCallable,
  AnyContinuationCallable,
  EffectContinuationCallable,
} from "./spec/runtime-args";

export type {
  EffectRollDieDefinition,
  EffectShuffleDefinition,
  EffectShufflePlayerZoneDefinition,
  EffectDefinition,
  EffectMap,
  EffectRegistryOfPhase,
} from "./spec/effects";

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
  CardActionSpec,
  AnyCardActionSpec,
  CardActionMap,
  AnyInteractionSpec,
  InteractionMap,
  StageSpec,
  StageMap,
  PhaseZoneList,
} from "./spec/interactions";

export type {
  AutoPhaseDefinition,
  PlayerPhaseDefinition,
  SimultaneousPlayerPhaseDefinition,
  PhaseDefinition,
} from "./spec/phases";

export type {
  ViewDefinition,
  StaticViewDefinition,
} from "./spec/views";
