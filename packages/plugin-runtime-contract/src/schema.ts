import { z } from "zod";
import {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
} from "./protocol.js";
import type { RuntimeJson } from "./json.js";
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

export const RuntimeJsonSchema: z.ZodType<RuntimeJson> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(RuntimeJsonSchema),
    z.record(z.string(), RuntimeJsonSchema),
  ]),
);

export const BoardStaticProjectionSchema = z
  .object({
    view: RuntimeJsonSchema,
    hash: z.string().optional(),
    manifestVersion: z.string().optional(),
  })
  .strict();

export const SetupGuidanceStepSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: z.string().optional(),
  })
  .strict();

export const GameGuidanceProjectionSchema = z
  .object({
    phase: z
      .object({
        id: z.string().min(1),
        label: z.string().min(1),
        summary: z.string().optional(),
        objective: z.string().optional(),
      })
      .strict(),
    setup: z
      .object({
        profileId: z.string().min(1),
        name: z.string().min(1),
        summary: z.string().optional(),
        steps: z.array(SetupGuidanceStepSchema),
      })
      .strict()
      .optional(),
  })
  .strict();

export const GameEventDetailSchema = z
  .object({
    label: z.string().min(1),
    value: z.union([z.string(), z.number().finite(), z.boolean()]),
  })
  .strict();

export const SystemActionEventSchema = z
  .object({
    kind: z.literal("systemAction"),
    procedureId: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().optional(),
    details: z.array(GameEventDetailSchema).optional(),
  })
  .strict();

export const GameEventSchema = z.discriminatedUnion("kind", [
  SystemActionEventSchema,
]);

export const ProjectedGameEventSchema = GameEventSchema.and(
  z
    .object({
      version: z.number().int().nonnegative(),
      index: z.number().int().nonnegative(),
    })
    .strict(),
);

export const SeatProjectionBundleSchema = z
  .object({
    currentStage: z.string().nullable().optional(),
    stageSeats: z.array(z.string()).optional(),
    simultaneousPhase: z.unknown().nullable().optional(),
    schedulerFlow: z
      .object({
        version: z.literal(1),
        activePlayerIds: z.array(z.string()),
        pendingPlayerIds: z.array(z.string()),
        continuationDependencies: z.array(
          z
            .object({
              waiterPlayerId: z.string(),
              blockerPlayerIds: z.array(z.string()),
            })
            .strict(),
        ),
      })
      .strict()
      .optional(),
    guidance: GameGuidanceProjectionSchema.nullable().optional(),
    recentEvents: z.array(ProjectedGameEventSchema).optional(),
    sharedView: z.unknown().optional(),
    interactionsByRef: z.record(z.string(), z.unknown()).optional(),
    seats: z.record(
      z.string(),
      z
        .object({
          view: z.unknown().optional(),
          availableInteractionRefs: z.array(z.string()).optional(),
          zones: z.unknown().optional(),
        })
        .strict(),
    ),
  })
  .strict();

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

const InputDomainDependencyCaseSchema: z.ZodType<unknown> = z.lazy(() =>
  z
    .object({
      when: z.record(z.string(), z.string()),
      domain: InputDomainSchema,
    })
    .strict(),
);

export const InputDomainDependenciesSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("eager"),
      dependentCases: z.array(InputDomainDependencyCaseSchema),
    })
    .strict(),
  z
    .object({
      mode: z.literal("lazy"),
      dependsOn: z.array(z.string()),
      resolver: z
        .object({
          interactionKey: z.string().optional(),
          inputKey: z.string(),
        })
        .strict(),
    })
    .strict(),
]);

export const InputDomainSchema = z
  .object({
    type: z.string(),
    selection: InputSelectionSchema.optional(),
    dependencies: InputDomainDependenciesSchema.optional(),
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
      status: z.literal("insufficientResources"),
      reason: z.string(),
      missingResources: z.record(z.string(), z.number().finite()),
    })
    .strict(),
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
    cost: z.record(z.string(), RuntimeJsonSchema).optional(),
    currentResources: z.record(z.string(), RuntimeJsonSchema).optional(),
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

export const InteractionContextSchema = z
  .object({
    to: z.string().min(1),
    title: z.string().optional(),
    payload: z.record(z.string(), RuntimeJsonSchema).optional(),
    options: z
      .array(
        z
          .object({
            id: z.string(),
            label: z.string().optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export const InteractionDescriptorSchema = z.discriminatedUnion("kind", [
  InteractionBaseSchema.extend({ kind: z.literal("action") }).strict(),
  InteractionBaseSchema.extend({
    kind: z.literal("prompt"),
    context: InteractionContextSchema,
  }).strict(),
]) as unknown as z.ZodType<InteractionDescriptor>;

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

export const SimultaneousPhaseSnapshotSchema = z
  .object({
    phaseName: z.string().min(1),
    interactionId: z.string().min(1),
    actorIds: z.array(PlayerIdSchema),
    sealedPlayerIds: z.array(PlayerIdSchema),
    pendingPlayerIds: z.array(PlayerIdSchema),
  })
  .strict();

export const GameplayBasisSchema = z
  .object({
    generation: z.number().int().nonnegative(),
    version: z.number().int().nonnegative(),
    actionSetVersion: z.string().min(1),
    perspectivePlayerId: PlayerIdSchema,
  })
  .strict() satisfies z.ZodType<GameplayBasis>;

export const GameOutcomeSchema = z
  .object({
    reason: z
      .object({
        code: z.string().min(1),
        message: z.string().optional(),
      })
      .strict(),
    standings: z.array(
      z
        .object({
          playerId: PlayerIdSchema,
          rank: z.number().int().positive(),
          result: z.enum(["win", "draw", "loss", "eliminated"]),
          score: z.number().finite().optional(),
          scoreBreakdown: z
            .array(
              z
                .object({
                  id: z.string().min(1),
                  label: z.string().min(1),
                  value: z.number().finite(),
                })
                .strict(),
            )
            .optional(),
          tieBreaks: z
            .array(
              z
                .object({
                  id: z.string().min(1),
                  label: z.string().min(1),
                  value: z.union([z.number().finite(), z.string()]),
                })
                .strict(),
            )
            .optional(),
        })
        .strict(),
    ),
  })
  .strict() satisfies z.ZodType<GameOutcome>;

export const PluginGameplayFrameSchema = z
  .object({
    basis: GameplayBasisSchema,
    view: RuntimeJsonSchema.nullable(),
    flow: z
      .object({
        currentPhase: z.string().nullable(),
        currentStage: z.string().nullable(),
        activePlayers: z.array(PlayerIdSchema),
        simultaneousPhase: SimultaneousPhaseSnapshotSchema.nullable(),
      })
      .strict(),
    availableInteractions: z.array(InteractionDescriptorSchema),
    guidance: GameGuidanceProjectionSchema.nullable().optional(),
    recentEvents: z.array(ProjectedGameEventSchema),
    zones: z.record(z.string(), ZoneHandlesSnapshotSchema),
  })
  .strict() as unknown as z.ZodType<PluginGameplayFrame>;

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
  z
    .object({
      type: z.literal("runtime.ack"),
      sequence: z.number().int().nonnegative(),
      clientReceivedAtMs: z.number().finite().optional(),
      clientRenderedAtMs: z.number().finite().optional(),
    })
    .strict(),
  SubmitInteractionCommandSchema,
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
