import { z } from "zod";
import { RuntimeJsonSchema } from "./runtime-json.js";

// Canonical wire schemas: no coercion, defaults, or game-authored refinements.
// Intentional hard cut: session meta.contractFingerprint is no longer admitted.
export const ReducerContractVersionSchema = z
  .string()
  .regex(new RegExp("^[0-9]+\\.[0-9]+\\.[0-9]+$"));

export const RngOperationParameterSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
]);

export const RngOperationSchema = z.strictObject({
  kind: z.string().min(1),
  parameters: z.record(z.string(), RngOperationParameterSchema),
});

export const RngDrawSchema = z.strictObject({
  index: z.number().int().gte(0),
  cursorBefore: z.number().int().gte(0),
  cursorAfter: z.number().int().gte(0),
  operation: RngOperationSchema,
});

export const RngStateSchema = z.strictObject({
  seed: z.union([
    z.number().refine(Number.isInteger, { message: "Expected integer" }),
    z.null(),
  ]),
  cursor: z.number().int(),
  trace: z.array(z.string()),
  draws: z.array(RngDrawSchema).optional(),
});

export const ReducerFlowStateSchema = z.strictObject({
  currentPhase: z.string().min(1),
  turn: z.number().int(),
  round: z.number().int(),
  activePlayers: z.array(z.string().min(1)),
});

export const RuntimeSimultaneousSubmissionSchema = z.strictObject({
  interactionId: z.string().min(1),
  params: RuntimeJsonSchema,
});

export const RuntimeSimultaneousCurrentSchema = z.strictObject({
  phaseName: z.string().min(1),
  actors: z.array(z.string().min(1)),
  submissions: z.record(z.string(), RuntimeSimultaneousSubmissionSchema),
});

export const RuntimeSimultaneousStateSchema = z.strictObject({
  current: z.union([RuntimeSimultaneousCurrentSchema, z.null()]),
});

export const TransitionRecordSchema = z.strictObject({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const RuntimePendingInteractionSchema = z.strictObject({
  phaseName: z.string().min(1),
  interactionId: z.string().min(1),
  values: z.array(RuntimeJsonSchema).min(1),
});

export const GameEventDetailSchema = z.strictObject({
  label: z.string().min(1),
  value: z.union([z.string(), z.number().finite(), z.boolean()]),
});

export const SystemActionEventSchema = z.strictObject({
  kind: z.literal("systemAction"),
  procedureId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1).optional(),
  details: z.array(GameEventDetailSchema).max(16).optional(),
});

export const GameEventSchema = z.discriminatedUnion("kind", [
  SystemActionEventSchema,
]);

export const ReducerRuntimeStateSchema = z.strictObject({
  events: z.array(GameEventSchema).max(32),
  rng: RngStateSchema,
  pending: z.record(z.string(), RuntimePendingInteractionSchema),
  simultaneous: RuntimeSimultaneousStateSchema,
  lastTransition: z.union([TransitionRecordSchema, z.null()]),
  options: z.record(z.string(), RuntimeJsonSchema),
});

export const ReducerDomainStateSchema = z.strictObject({
  table: RuntimeJsonSchema,
  publicState: RuntimeJsonSchema,
  privateState: z.record(z.string(), RuntimeJsonSchema),
  hiddenState: RuntimeJsonSchema,
  flow: ReducerFlowStateSchema,
  phase: RuntimeJsonSchema,
});

export const ReducerSessionStateSchema = z.strictObject({
  domain: ReducerDomainStateSchema,
  runtime: ReducerRuntimeStateSchema,
});

export const GameInputInteractionSchema = z.strictObject({
  kind: z.literal("interaction"),
  playerId: z.string().min(1),
  interactionId: z.string().min(1),
  params: RuntimeJsonSchema,
});

export const GameInputCancelSchema = z.strictObject({
  kind: z.literal("interaction.cancel"),
  playerId: z.string().min(1),
  interactionId: z.string().min(1),
});

export const GameInputSchema = z.discriminatedUnion("kind", [
  GameInputInteractionSchema,
  GameInputCancelSchema,
]);

export const GameOutcomeReasonSchema = z.strictObject({
  code: z.string().min(1),
  message: z.string().min(1).optional(),
});

export const OutcomeResultSchema = z.enum([
  "win",
  "draw",
  "loss",
  "eliminated",
]);

export const OutcomeScoreComponentSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.number().finite(),
});

export const OutcomeTieBreakSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.union([z.number().finite(), z.string()]),
});

export const OutcomeStandingSchema = z.strictObject({
  playerId: z.string().min(1),
  rank: z.number().int().gte(1),
  result: OutcomeResultSchema,
  score: z.number().finite().optional(),
  scoreBreakdown: z.array(OutcomeScoreComponentSchema).optional(),
  tieBreaks: z.array(OutcomeTieBreakSchema).optional(),
});

export const GameOutcomeSchema = z.strictObject({
  reason: GameOutcomeReasonSchema,
  standings: z.array(OutcomeStandingSchema).min(1),
});

export const InitializeResultSchema = z.strictObject({
  state: ReducerSessionStateSchema,
  terminal: GameOutcomeSchema.optional(),
  events: z.array(GameEventSchema).optional(),
});

export const InitializeRequestSchema = z.strictObject({
  table: RuntimeJsonSchema,
  playerIds: z.array(z.string().min(1)),
  rngSeed: z
    .union([
      z.number().refine(Number.isInteger, { message: "Expected integer" }),
      z.null(),
    ])
    .optional(),
  options: z.record(z.string(), RuntimeJsonSchema).optional(),
});

export const DispatchRequestSchema = z.strictObject({
  state: ReducerSessionStateSchema,
  input: GameInputSchema,
});

export const DispatchTraceAcceptedClientInputSchema = z.strictObject({
  kind: z.literal("acceptedClientInput"),
  input: GameInputSchema,
});

export const DispatchTracePhaseEnteredSchema = z.strictObject({
  kind: z.literal("phaseEntered"),
  from: z.string(),
  to: z.string(),
});

export const DispatchTraceRngConsumptionSchema = z.strictObject({
  kind: z.literal("rngConsumption"),
  version: z.literal(2),
  operation: z.string().min(1),
  drawIndex: z.number().int().gte(0),
  traceEntry: z.string(),
});

export const DispatchTraceSchema = z.discriminatedUnion("kind", [
  DispatchTraceAcceptedClientInputSchema,
  DispatchTracePhaseEnteredSchema,
  DispatchTraceRngConsumptionSchema,
]);

export const DispatchResultRejectSchema = z.strictObject({
  kind: z.literal("reject"),
  errorCode: z.string().min(1),
  message: z.string().optional(),
});

export const DispatchResultAcceptSchema = z.strictObject({
  kind: z.literal("accept"),
  state: ReducerSessionStateSchema,
  terminal: GameOutcomeSchema.optional(),
  trace: z.array(DispatchTraceSchema),
  events: z.array(GameEventSchema).max(32),
});

export const DispatchResultSchema = z.discriminatedUnion("kind", [
  DispatchResultRejectSchema,
  DispatchResultAcceptSchema,
]);

export const ReducerRuntimeLogEntryAcceptedClientInputSchema = z.strictObject({
  kind: z.literal("acceptedClientInput"),
  version: z.number().int(),
  input: GameInputSchema,
});

export const ReducerRuntimeLogEntryPhaseEnteredSchema = z.strictObject({
  kind: z.literal("phaseEntered"),
  from: z.string(),
  to: z.string(),
  version: z.number().int(),
});

export const ReducerRuntimeLogEntryRngConsumptionSchema = z.strictObject({
  kind: z.literal("rngConsumption"),
  version: z.number().int(),
  operation: z.string().min(1),
  drawIndex: z.number().int().gte(0).optional(),
  traceEntry: z.string(),
});

export const ReducerRuntimeLogEntryStateCommitSchema = z.strictObject({
  kind: z.literal("stateCommit"),
  version: z.number().int(),
  state: ReducerSessionStateSchema,
});

export const ReducerRuntimeLogEntrySchema = z.discriminatedUnion("kind", [
  ReducerRuntimeLogEntryAcceptedClientInputSchema,
  ReducerRuntimeLogEntryPhaseEnteredSchema,
  ReducerRuntimeLogEntryRngConsumptionSchema,
  ReducerRuntimeLogEntryStateCommitSchema,
]);

export const SeatProjectionSchema = z.strictObject({
  view: RuntimeJsonSchema.optional(),
  availableInteractionRefs: RuntimeJsonSchema.optional(),
  zones: RuntimeJsonSchema.optional(),
});

export const SimultaneousPhaseProjectionSchema = z.strictObject({
  phaseName: z.string().min(1),
  interactionId: z.string().min(1),
  actorIds: z.array(z.string().min(1)),
  sealedPlayerIds: z.array(z.string().min(1)),
  pendingPlayerIds: z.array(z.string().min(1)),
});

export const SchedulerContinuationDependencySchema = z.strictObject({
  waiterPlayerId: z.string().min(1),
  blockerPlayerIds: z.array(z.string().min(1)),
});

export const SchedulerFlowAuthorityProjectionSchema = z.strictObject({
  version: z.literal(1),
  activePlayerIds: z.array(z.string().min(1)),
  pendingPlayerIds: z.array(z.string().min(1)),
  continuationDependencies: z.array(SchedulerContinuationDependencySchema),
});

export const ProjectionTimingMetadataSchema = z.strictObject({
  resolveAvailableInteractionsMs: z.number().finite().gte(0),
  resolveViewMs: z.number().finite().gte(0),
  resolveZoneHandlesMs: z.number().finite().gte(0),
  descriptorHashMs: z.number().finite().gte(0),
});

export const SeatProjectionBundleSchema = z.strictObject({
  events: z.array(GameEventSchema).max(32),
  currentStage: z.union([z.string().min(1), z.null()]).optional(),
  stageSeats: z.array(z.string().min(1)).optional(),
  simultaneousPhase: z
    .union([SimultaneousPhaseProjectionSchema, z.null()])
    .optional(),
  schedulerFlow: SchedulerFlowAuthorityProjectionSchema.optional(),
  sharedView: RuntimeJsonSchema.optional(),
  interactionsByRef: RuntimeJsonSchema.optional(),
  seats: z.record(z.string(), SeatProjectionSchema),
  timing: ProjectionTimingMetadataSchema.optional(),
});

export const ProjectRequestSchema = z.strictObject({
  state: ReducerSessionStateSchema,
  playerIds: z.array(z.string().min(1)),
});

export const BoardStaticProjectionSchema = z.strictObject({
  view: RuntimeJsonSchema,
  hash: z.string().min(1),
  manifestVersion: z.string(),
});
