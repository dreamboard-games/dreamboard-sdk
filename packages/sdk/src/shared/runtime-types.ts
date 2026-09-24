import type { z } from "zod";
import type * as Schemas from "./runtime-schema.js";

// DTOs are inferred from the admitting schemas.
export type ReducerContractVersion = z.infer<
  typeof Schemas.ReducerContractVersionSchema
>;
export type RngOperationParameter = z.infer<
  typeof Schemas.RngOperationParameterSchema
>;
export type RngOperation = z.infer<typeof Schemas.RngOperationSchema>;
export type RngDraw = z.infer<typeof Schemas.RngDrawSchema>;
export type RngState = z.infer<typeof Schemas.RngStateSchema>;
export type ReducerFlowState = z.infer<typeof Schemas.ReducerFlowStateSchema>;
export type RuntimeSimultaneousSubmission = z.infer<
  typeof Schemas.RuntimeSimultaneousSubmissionSchema
>;
export type RuntimeSimultaneousCurrent = z.infer<
  typeof Schemas.RuntimeSimultaneousCurrentSchema
>;
export type RuntimeSimultaneousState = z.infer<
  typeof Schemas.RuntimeSimultaneousStateSchema
>;
export type TransitionRecord = z.infer<typeof Schemas.TransitionRecordSchema>;
export type ReducerRuntimeState = z.infer<
  typeof Schemas.ReducerRuntimeStateSchema
>;
export type ReducerDomainState = z.infer<
  typeof Schemas.ReducerDomainStateSchema
>;
export type ReducerSessionState = z.infer<
  typeof Schemas.ReducerSessionStateSchema
>;
export type GameInputInteraction = z.infer<
  typeof Schemas.GameInputInteractionSchema
>;
export type GameInput = z.infer<typeof Schemas.GameInputSchema>;
export type GameOutcomeReason = z.infer<typeof Schemas.GameOutcomeReasonSchema>;
export type OutcomeResult = z.infer<typeof Schemas.OutcomeResultSchema>;
export type OutcomeScoreComponent = z.infer<
  typeof Schemas.OutcomeScoreComponentSchema
>;
export type OutcomeTieBreak = z.infer<typeof Schemas.OutcomeTieBreakSchema>;
export type OutcomeStanding = z.infer<typeof Schemas.OutcomeStandingSchema>;
export type GameOutcome = z.infer<typeof Schemas.GameOutcomeSchema>;
export type GameEventDetail = z.infer<typeof Schemas.GameEventDetailSchema>;
export type SystemActionEvent = z.infer<typeof Schemas.SystemActionEventSchema>;
export type GameEvent = z.infer<typeof Schemas.GameEventSchema>;
export type InitializeResult = z.infer<typeof Schemas.InitializeResultSchema>;
export type InitializeRequest = z.infer<typeof Schemas.InitializeRequestSchema>;
export type DispatchRequest = z.infer<typeof Schemas.DispatchRequestSchema>;
export type DispatchTraceAcceptedClientInput = z.infer<
  typeof Schemas.DispatchTraceAcceptedClientInputSchema
>;
export type DispatchTracePhaseEntered = z.infer<
  typeof Schemas.DispatchTracePhaseEnteredSchema
>;
export type DispatchTraceRngConsumption = z.infer<
  typeof Schemas.DispatchTraceRngConsumptionSchema
>;
export type DispatchTrace = z.infer<typeof Schemas.DispatchTraceSchema>;
export type DispatchResultReject = z.infer<
  typeof Schemas.DispatchResultRejectSchema
>;
export type DispatchResultAccept = z.infer<
  typeof Schemas.DispatchResultAcceptSchema
>;
export type DispatchResult = z.infer<typeof Schemas.DispatchResultSchema>;
export type ReducerRuntimeLogEntryAcceptedClientInput = z.infer<
  typeof Schemas.ReducerRuntimeLogEntryAcceptedClientInputSchema
>;
export type ReducerRuntimeLogEntryPhaseEntered = z.infer<
  typeof Schemas.ReducerRuntimeLogEntryPhaseEnteredSchema
>;
export type ReducerRuntimeLogEntryRngConsumption = z.infer<
  typeof Schemas.ReducerRuntimeLogEntryRngConsumptionSchema
>;
export type ReducerRuntimeLogEntryStateCommit = z.infer<
  typeof Schemas.ReducerRuntimeLogEntryStateCommitSchema
>;
export type ReducerRuntimeLogEntry = z.infer<
  typeof Schemas.ReducerRuntimeLogEntrySchema
>;
export type SeatProjection = z.infer<typeof Schemas.SeatProjectionSchema>;
export type SimultaneousPhaseProjection = z.infer<
  typeof Schemas.SimultaneousPhaseProjectionSchema
>;
export type SchedulerContinuationDependency = z.infer<
  typeof Schemas.SchedulerContinuationDependencySchema
>;
export type SchedulerFlowAuthorityProjection = z.infer<
  typeof Schemas.SchedulerFlowAuthorityProjectionSchema
>;
export type ProjectionTimingMetadata = z.infer<
  typeof Schemas.ProjectionTimingMetadataSchema
>;
export type SeatProjectionBundle = z.infer<
  typeof Schemas.SeatProjectionBundleSchema
>;
export type ProjectRequest = z.infer<typeof Schemas.ProjectRequestSchema>;
export type BoardStaticProjection = z.infer<
  typeof Schemas.BoardStaticProjectionSchema
>;

export type RuntimePendingInteraction = z.infer<
  typeof Schemas.RuntimePendingInteractionSchema
>;
export type GameInputCancel = z.infer<typeof Schemas.GameInputCancelSchema>;
