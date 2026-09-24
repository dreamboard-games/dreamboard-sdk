import * as ReducerWireZod from "../runtime-schema";
import { z } from "zod";
import {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
} from "./protocol.js";
import { RuntimeJsonSchema } from "../runtime-json.js";
import type {
  GameOutcome,
  GameplayBasis,
  InteractionDescriptor,
  PluginGameplayFrame,
  PluginSessionDescriptor,
  ZoneHandlesSnapshot,
} from "./frame.js";
import type {
  HostToPluginPayload,
  InteractionResult,
  PluginProtocolEnvelope,
  PluginProtocolTape,
  PluginToHostPayload,
} from "./protocol.js";

export const BoardStaticProjectionSchema =
  ReducerWireZod.BoardStaticProjectionSchema;
export const GameEventDetailSchema = ReducerWireZod.GameEventDetailSchema;
export const SystemActionEventSchema = ReducerWireZod.SystemActionEventSchema;
export const GameEventSchema = ReducerWireZod.GameEventSchema;
export const SeatProjectionBundleSchema =
  ReducerWireZod.SeatProjectionBundleSchema;

export const PlayerIdSchema = z.string().min(1);

export const PluginPlayerSummarySchema = z
  .object({
    playerId: PlayerIdSchema,
    displayName: z.string(),
    color: z.string().optional(),
  })
  .strict();

export const PluginSessionDescriptorSchema = z
  .object({
    sessionId: z.string().min(1),
    players: z.array(PluginPlayerSummarySchema),
  })
  .strict() satisfies z.ZodType<PluginSessionDescriptor>;

export const InteractionCommitPolicySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("manual") }).strict(),
  z.object({ mode: z.literal("autoWhenReady") }).strict(),
]);

export const InputSelectionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("single") }).strict(),
  z
    .object({
      mode: z.literal("many"),
      min: z.number().int(),
      max: z.number().int().optional(),
      distinct: z.boolean().optional(),
    })
    .strict(),
]);

export const InputDomainSchema = z
  .object({
    type: z.string(),
    selection: InputSelectionSchema.optional(),
  })
  .catchall(RuntimeJsonSchema);

export const InteractionChoiceOptionSchema = z
  .object({
    value: z.string().nullable(),
    label: z.string(),
    icon: z.string().optional(),
    badge: z.string().optional(),
    description: z.string().optional(),
    disabled: z.boolean().optional(),
    disabledReason: z.string().optional(),
  })
  .strict();

export const InteractionInputDescriptorSchema = z
  .object({
    key: z.string().min(1),
    kind: z.string().min(1),
    domain: InputDomainSchema,
    defaultValue: RuntimeJsonSchema.optional(),
  })
  .strict();

export const InteractionAvailabilitySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("available") }).strict(),
  z.object({ status: z.literal("notYourTurn"), reason: z.string() }).strict(),
  z
    .object({
      status: z.literal("blocked"),
      reason: z.string(),
      code: z.string().optional(),
    })
    .strict(),
]);

const InteractionBaseSchema = z
  .object({
    phaseName: z.string().min(1),
    interactionKey: z.string().min(1),
    interactionId: z.string().min(1),
    label: z.string().min(1),
    help: z.string().optional(),
    zoneId: z.string().optional(),
    zoneIds: z.array(z.string()).optional(),
    commit: InteractionCommitPolicySchema,
    descriptorDigest: z.string().optional(),
    actorSeat: z.number().int().optional(),
    draftDigest: z.string().optional(),
    inputs: z.array(InteractionInputDescriptorSchema),
    step: z
      .object({
        index: z.number().int().nonnegative(),
        total: z.number().int().positive(),
        selected: z.record(z.string(), RuntimeJsonSchema),
        canCancel: z.boolean(),
      })
      .strict()
      .optional(),
    availability: InteractionAvailabilitySchema,
    reasons: z
      .array(
        z
          .object({
            ruleId: z.string(),
            errorCode: z.string(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export const InteractionDescriptorSchema = InteractionBaseSchema.extend({
  kind: z.literal("action"),
}).strict() as unknown as z.ZodType<InteractionDescriptor>;

export const ZoneHandlesSnapshotSchema = z
  .object({
    cardIds: z.array(z.string()),
    cardViewsById: z.record(z.string(), z.string()),
    playableByCardId: z.record(
      z.string(),
      z.array(InteractionDescriptorSchema),
    ),
  })
  .strict() as unknown as z.ZodType<ZoneHandlesSnapshot>;

export const SimultaneousPhaseSnapshotSchema =
  ReducerWireZod.SimultaneousPhaseProjectionSchema;

export const GameplayBasisSchema = z
  .object({
    version: z.number().int().nonnegative(),
    actionSetVersion: z.string().min(1),
    perspectivePlayerId: PlayerIdSchema,
  })
  .strict() satisfies z.ZodType<GameplayBasis>;

export const GameOutcomeSchema =
  ReducerWireZod.GameOutcomeSchema satisfies z.ZodType<GameOutcome>;

export const SeatFrameSchema = z
  .object({
    events: z.array(GameEventSchema).max(32),
    view: z.record(z.string(), RuntimeJsonSchema).nullable(),
    flow: z
      .object({
        currentPhase: z.string().nullable(),
        currentStage: z.string().nullable(),
        activePlayers: z.array(PlayerIdSchema),
        simultaneousPhase: SimultaneousPhaseSnapshotSchema.nullable(),
      })
      .strict(),
    availableInteractions: z.array(InteractionDescriptorSchema),
    zones: z.record(z.string(), ZoneHandlesSnapshotSchema),
  })
  .strict();

export const PluginGameplayFrameSchema = SeatFrameSchema.extend({
  basis: GameplayBasisSchema,
}) as unknown as z.ZodType<PluginGameplayFrame>;

export const InteractionResultSchema = z.discriminatedUnion("accepted", [
  z
    .object({
      type: z.literal("interaction.result"),
      clientActionId: z.string().min(1),
      accepted: z.literal(true),
    })
    .strict(),
  z
    .object({
      type: z.literal("interaction.result"),
      clientActionId: z.string().min(1),
      accepted: z.literal(false),
      errorCode: z.string().min(1),
      message: z.string().optional(),
    })
    .strict(),
]) satisfies z.ZodType<InteractionResult>;

export const SubmitInteractionCommandSchema = z
  .object({
    type: z.literal("interaction.submit"),
    clientActionId: z.string().min(1),
    basis: GameplayBasisSchema,
    interactionId: z.string().min(1),
    params: RuntimeJsonSchema,
  })
  .strict();

export const CancelInteractionCommandSchema =
  SubmitInteractionCommandSchema.omit({ params: true })
    .extend({ type: z.literal("interaction.cancel") })
    .strict();

export const HostToPluginPayloadSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("runtime.init"),
      session: PluginSessionDescriptorSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("gameplay.frame"),
      frame: PluginGameplayFrameSchema,
    })
    .strict(),
  InteractionResultSchema,
]) as unknown as z.ZodType<HostToPluginPayload>;

export const PluginToHostPayloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("runtime.ready") }).strict(),
  z.object({ type: z.literal("runtime.resume") }).strict(),
  z
    .object({
      type: z.literal("runtime.ack"),
      sequence: z.number().int().nonnegative(),
      clientReceivedAtMs: z.number().finite().optional(),
      clientRenderedAtMs: z.number().finite().optional(),
    })
    .strict(),
  SubmitInteractionCommandSchema,
  CancelInteractionCommandSchema,
  z
    .object({
      type: z.literal("runtime.error"),
      message: z.string(),
      code: z.string().optional(),
    })
    .strict(),
]) satisfies z.ZodType<PluginToHostPayload>;

export function createPluginProtocolEnvelopeSchema<Payload>(
  payloadSchema: z.ZodType<Payload>,
): z.ZodType<PluginProtocolEnvelope<Payload>> {
  return z
    .object({
      protocol: z.literal(DREAMBOARD_PLUGIN_PROTOCOL),
      version: z.literal(DREAMBOARD_PLUGIN_PROTOCOL_VERSION),
      channelId: z.string().min(1),
      sequence: z.number().int().nonnegative(),
      payload: payloadSchema,
    })
    .strict();
}

export const HostToPluginEnvelopeSchema = createPluginProtocolEnvelopeSchema(
  HostToPluginPayloadSchema,
);

export const PluginToHostEnvelopeSchema = createPluginProtocolEnvelopeSchema(
  PluginToHostPayloadSchema,
);

export const PluginProtocolFrameSchema = z
  .object({
    id: z.string().min(1),
    frame: PluginGameplayFrameSchema,
    projectionDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  })
  .strict();

export const PluginProtocolStepSchema = z.discriminatedUnion("kind", [
  z
    .object({
      id: z.string().min(1),
      kind: z.literal("host.frame"),
      frameId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      id: z.string().min(1),
      kind: z.literal("client.submit"),
      fromFrameId: z.string().min(1),
      requestDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
      response: InteractionResultSchema,
    })
    .strict(),
]);

export const PluginProtocolTapeSchema = z
  .object({
    session: PluginSessionDescriptorSchema,
    frames: z.array(PluginProtocolFrameSchema),
    steps: z.array(PluginProtocolStepSchema),
  })
  .strict() as unknown as z.ZodType<PluginProtocolTape>;

export function parsePluginSessionDescriptor(
  value: unknown,
): PluginSessionDescriptor {
  return PluginSessionDescriptorSchema.parse(value);
}

export function parsePluginGameplayFrame(value: unknown): PluginGameplayFrame {
  return PluginGameplayFrameSchema.parse(value);
}

export function parseHostToPluginEnvelope(
  value: unknown,
): PluginProtocolEnvelope<HostToPluginPayload> {
  return HostToPluginEnvelopeSchema.parse(value);
}

export function parsePluginToHostEnvelope(
  value: unknown,
): PluginProtocolEnvelope<PluginToHostPayload> {
  return PluginToHostEnvelopeSchema.parse(value);
}
