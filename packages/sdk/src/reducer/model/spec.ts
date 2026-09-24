// Barrel for the split spec/ modules. Re-exports exactly the names the
// original monolithic spec.ts exported, so importers of "./spec",
// "./model/spec", or "../model/spec" are unaffected. Internal-only helpers
// (e.g. BivariantCallback, PhaseDefinitionCommon) are intentionally not
// re-exported here.

export type {
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
  RngInputCollectorMeta,
  InputCollectorMetaForKind,
  InputSelectionDescriptor,
  CardTargetDomainDescriptor,
  ResolvedCardTargetDomainDescriptor,
  BoardTargetDomainDescriptor,
  ResolvedBoardTargetDomainDescriptor,
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
  InteractionSpec,
  AnyInteractionSpec,
  InteractionMap,
} from "./spec/interactions";

export type {
  AutoPhaseDefinition,
  PlayerPhaseDefinition,
  SimultaneousPlayerPhaseDefinition,
  PhaseDefinition,
} from "./spec/phases";

export type { ViewDefinition } from "./spec/views";
