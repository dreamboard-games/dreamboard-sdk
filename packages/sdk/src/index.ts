export {
  DREAMBOARD_SDK_PACKAGE_SET,
  DREAMBOARD_SDK_PACKAGES,
  DREAMBOARD_SDK_VERSION,
  type DreamboardSdkPackageName,
  type DreamboardSdkPackageSet,
} from "./package-set.js";
export {
  createGameInstance,
  AmbiguousTargetError,
} from "./headless/instance.js";
export type * from "./headless/model.js";
export * from "./headless/sources/index.js";

export * from "./headless/features/hand.js";
export * from "./headless/features/board.js";
export * from "./headless/features/drag.js";
export * from "./headless/features/pan-zoom.js";

export type {
  ActionInteractionDescriptor,
  GameEvent,
  GameEventDetail,
  GameOutcome,
  GameplayBasis,
  InteractionAvailability,
  InteractionChoiceOption,
  InteractionCommitPolicy,
  InteractionDescriptor,
  InteractionDiagnosticReason,
  InteractionInputDescriptor,
  InputDomain,
  InputSelection,
  OutcomeResult,
  OutcomeScoreComponent,
  OutcomeStanding,
  OutcomeTieBreak,
  PlayerId,
  PluginGameplayFrame,
  PluginPlayerSummary,
  PluginSessionDescriptor,
  ReducerBoardStaticProjection,
  ReducerSeatProjectionBundle,
  SimultaneousPhaseSnapshot,
  SystemActionEvent,
  ZoneHandlesSnapshot,
} from "./shared/protocol/frame.js";
export type { RuntimeJson } from "./shared/runtime-json.js";
export type {
  ActionSetVersionInput,
  HostToPluginEnvelope,
  HostToPluginPayload,
  InteractionResult,
  PluginProtocolEnvelope,
  PluginToHostEnvelope,
  PluginToHostPayload,
  SubmitInteractionCommand,
  CancelInteractionCommand,
} from "./shared/protocol/protocol.js";
export {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
} from "./shared/protocol/protocol.js";
export {
  canonicalizePluginRuntimeJson,
  computePluginActionSetVersion,
  digestPluginCommandRequest,
  digestPluginGameplayFrame,
  digestPluginRuntimeJson,
  encodeCanonicalPluginRuntimeJson,
} from "./shared/protocol/digest.js";
export {
  type MaterializePluginGameplayFrameInput,
  materializePluginGameplayFrame,
} from "./shared/protocol/projection.js";
export {
  BoardStaticProjectionSchema,
  GameEventDetailSchema,
  GameEventSchema,
  GameOutcomeSchema,
  GameplayBasisSchema,
  HostToPluginEnvelopeSchema,
  HostToPluginPayloadSchema,
  InputDomainSchema,
  InteractionAvailabilitySchema,
  InteractionCommitPolicySchema,
  InteractionDescriptorSchema,
  InteractionInputDescriptorSchema,
  PluginGameplayFrameSchema,
  SeatFrameSchema,
  PluginPlayerSummarySchema,
  PluginSessionDescriptorSchema,
  PluginToHostEnvelopeSchema,
  PluginToHostPayloadSchema,
  SeatProjectionBundleSchema,
  SimultaneousPhaseSnapshotSchema,
  InteractionResultSchema,
  SystemActionEventSchema,
  SubmitInteractionCommandSchema,
  CancelInteractionCommandSchema,
  ZoneHandlesSnapshotSchema,
  createPluginProtocolEnvelopeSchema,
  parseHostToPluginEnvelope,
  parsePluginGameplayFrame,
  parsePluginSessionDescriptor,
  parsePluginToHostEnvelope,
} from "./shared/protocol/schema.js";

export { RuntimeJsonSchema } from "./shared/runtime-json.js";
export * from "./shared/protocol/gameplay-wire.js";
export type { ViewCard } from "./shared/domain/cards.js";
