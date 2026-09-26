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
  PluginGameplayFrame,
  PluginSessionDescriptor,
  ZoneHandlesSnapshot,
} from "./frame.js";
import type {
  HostToPluginPayload,
  InteractionResult,
  PluginProtocolEnvelope,
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
    assets: z.record(z.string(), z.instanceof(Blob)).optional(),
  })
  .strict() satisfies z.ZodType<PluginSessionDescriptor>;

export {
  InteractionCommitPolicySchema,
  InputSelectionSchema,
  InputDomainSchema,
  InteractionChoiceOptionSchema,
  InteractionInputDescriptorSchema,
  InteractionAvailabilitySchema,
  InteractionDescriptorSchema,
} from "../interaction-schema.js";
import { InteractionDescriptorSchema } from "../interaction-schema.js";

export const ZoneHandlesSnapshotSchema = z
  .object({
    cardIds: z.array(z.string()),
    cardViewsById: z.record(z.string(), z.string()),
    playableByCardId: z.record(
      z.string(),
      z.array(InteractionDescriptorSchema),
    ),
  })
  .strict() satisfies z.ZodType<ZoneHandlesSnapshot>;

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
}) satisfies z.ZodType<PluginGameplayFrame>;

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
]) satisfies z.ZodType<HostToPluginPayload>;

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
