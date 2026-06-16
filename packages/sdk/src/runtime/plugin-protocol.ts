import { z } from "zod";
import {
  RuntimeJsonSchema,
  TRANSPORT_JSON_LIMITS,
  assertJsonWithinLimits,
} from "../runtime-json.js";
import type { PluginStateSnapshot } from "./types/plugin-state.js";

export const DREAMBOARD_PLUGIN_PROTOCOL = "dreamboard-plugin";
export const DREAMBOARD_PLUGIN_PROTOCOL_VERSION = 2;

const PluginEnvelopeBaseSchema = z
  .object({
    protocol: z.literal(DREAMBOARD_PLUGIN_PROTOCOL),
    version: z.literal(DREAMBOARD_PLUGIN_PROTOCOL_VERSION),
    channelId: z.string().min(32).max(256),
  })
  .strict();

const PlayerIdSchema = z.string();
const RuntimeRecordSchema = z.record(z.string(), RuntimeJsonSchema);
const NullableRuntimeJsonSchema = RuntimeJsonSchema.nullable();

const SeatAssignmentSchema = z
  .object({
    playerId: PlayerIdSchema,
    controllerUserId: z.string().optional(),
    displayName: z.string(),
    playerColor: z.string().optional(),
    isHost: z.boolean().optional(),
  })
  .strict();

const LobbyStateSchema = z
  .object({
    seats: z.array(SeatAssignmentSchema),
    canStart: z.boolean(),
    hostUserId: z.string(),
  })
  .strict();

const NotificationPayloadSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("YOUR_TURN"),
      activePlayers: z.array(PlayerIdSchema),
    })
    .strict(),
  z
    .object({
      type: z.literal("PROMPT_OPENED"),
      promptId: z.string(),
      promptInstanceId: z.string(),
      targetPlayer: PlayerIdSchema,
      title: z.string().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("ACTION_EXECUTED"),
      playerId: PlayerIdSchema,
      actionType: z.string(),
    })
    .strict(),
  z
    .object({
      type: z.literal("ACTION_REJECTED"),
      reason: z.string(),
      targetPlayer: z.string().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("TURN_CHANGED"),
      previousPlayers: z.array(PlayerIdSchema),
      currentPlayers: z.array(PlayerIdSchema),
    })
    .strict(),
  z
    .object({
      type: z.literal("STATE_CHANGED"),
      newState: z.string(),
    })
    .strict(),
  z
    .object({
      type: z.literal("GAME_ENDED"),
      winner: z.string().optional(),
      finalScores: z.record(z.string(), z.number().finite()),
      reason: z.string(),
    })
    .strict(),
  z
    .object({
      type: z.literal("ERROR"),
      message: z.string(),
      code: z.string().optional(),
    })
    .strict(),
]);

const NotificationSchema = z
  .object({
    id: z.string(),
    type: z.enum([
      "YOUR_TURN",
      "PROMPT_OPENED",
      "ACTION_EXECUTED",
      "ACTION_REJECTED",
      "TURN_CHANGED",
      "STATE_CHANGED",
      "GAME_ENDED",
      "ERROR",
    ]),
    payload: NotificationPayloadSchema,
    timestamp: z.number().finite(),
    read: z.boolean(),
  })
  .strict();

const PluginSessionStateSchema = z
  .object({
    sessionId: z.string().nullable(),
    controllablePlayerIds: z.array(PlayerIdSchema),
    controllingPlayerId: PlayerIdSchema.nullable(),
    userId: z.string().nullable(),
  })
  .strict();

const HistoryEntrySummarySchema = z
  .object({
    id: z.string(),
    version: z.number().int(),
    timestamp: z.string(),
    description: z.string(),
    playerId: PlayerIdSchema.optional(),
    actionType: z.string().optional(),
    isCurrent: z.boolean(),
  })
  .strict();

const HistoryStateSchema = z
  .object({
    entries: z.array(HistoryEntrySummarySchema),
    currentIndex: z.number().int(),
    canGoBack: z.boolean(),
    canGoForward: z.boolean(),
  })
  .strict();

const SimultaneousPhaseSchema = z
  .object({
    phaseName: z.string(),
    interactionId: z.string(),
    actorIds: z.array(PlayerIdSchema),
    sealedPlayerIds: z.array(PlayerIdSchema),
    pendingPlayerIds: z.array(PlayerIdSchema),
  })
  .strict();

const InteractionCommitPolicySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("manual") }).strict(),
  z.object({ mode: z.literal("autoWhenReady") }).strict(),
]);

const InputSelectionSchema = z.discriminatedUnion("mode", [
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

const InputDomainDependencyCaseSchema = z
  .object({
    when: z.record(z.string(), z.string()),
    domain: RuntimeRecordSchema,
  })
  .strict();

const InputDomainResolverSchema = z.discriminatedUnion("mode", [
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

const InputDomainSchema = z
  .object({
    type: z.string(),
    selection: InputSelectionSchema.optional(),
    dependencies: InputDomainResolverSchema.optional(),
  })
  .catchall(RuntimeJsonSchema);

const InteractionInputDescriptorSchema = z
  .object({
    key: z.string(),
    kind: z.string(),
    domain: InputDomainSchema,
    defaultValue: RuntimeJsonSchema.optional(),
  })
  .strict();

const InteractionAvailabilitySchema = z.discriminatedUnion("status", [
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
    phaseName: z.string(),
    interactionKey: z.string(),
    interactionId: z.string(),
    commit: InteractionCommitPolicySchema,
    descriptorDigest: z.string().optional(),
    actorSeat: z.number().int().optional(),
    draftDigest: z.string().optional(),
    zoneId: z.string().optional(),
    zoneIds: z.array(z.string()).optional(),
    inputs: z.array(InteractionInputDescriptorSchema),
    cost: RuntimeRecordSchema.optional(),
    currentResources: RuntimeRecordSchema.optional(),
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

const InteractionDescriptorSchema = z.discriminatedUnion("kind", [
  InteractionBaseSchema.extend({ kind: z.literal("action") }).strict(),
  InteractionBaseSchema.extend({
    kind: z.literal("prompt"),
    context: z
      .object({
        to: z.string(),
        title: z.string().optional(),
        payload: RuntimeRecordSchema.optional(),
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
      .strict(),
  }).strict(),
]);

const ZoneHandlesSnapshotSchema = z
  .object({
    cardIds: z.array(z.string()),
    cardViewsById: z.record(z.string(), z.string()),
    playableByCardId: z.record(
      z.string(),
      z.array(InteractionDescriptorSchema),
    ),
  })
  .strict();

const GameplaySnapshotSchema = z
  .object({
    currentPhase: z.string().nullable(),
    currentStage: z.string().nullable(),
    activePlayers: z.array(PlayerIdSchema),
    simultaneousPhase: SimultaneousPhaseSchema.nullable().optional(),
    availableInteractions: z.array(InteractionDescriptorSchema),
    zones: z.record(z.string(), ZoneHandlesSnapshotSchema),
  })
  .strict();

export const PluginStateSnapshotSchema = z
  .object({
    view: NullableRuntimeJsonSchema,
    gameplay: GameplaySnapshotSchema,
    lobby: LobbyStateSchema.nullable(),
    notifications: z.array(NotificationSchema),
    session: PluginSessionStateSchema,
    history: HistoryStateSchema.nullable(),
    syncId: z.number().int(),
  })
  .strict() as unknown as z.ZodType<PluginStateSnapshot>;

const InitPayloadSchema = z
  .object({
    type: z.literal("init"),
    sessionId: z.string(),
    controllablePlayerIds: z.array(z.string()),
    controllingPlayerId: z.string(),
    userId: z.string().nullable(),
    state: PluginStateSnapshotSchema.optional(),
  })
  .strict();

const PingPayloadSchema = z.object({ type: z.literal("ping") }).strict();

const StateSyncPayloadSchema = z
  .object({
    type: z.literal("state-sync"),
    syncId: z.number().int(),
    state: PluginStateSnapshotSchema,
  })
  .strict();

const ValidateInteractionResultPayloadSchema = z
  .object({
    type: z.literal("validate-interaction-result"),
    messageId: z.string(),
    result: z
      .object({
        valid: z.boolean(),
        errorCode: z.string().nullable().optional(),
        message: z.string().nullable().optional(),
      })
      .strict(),
  })
  .strict();

const SubmitResultPayloadSchema = z
  .object({
    type: z.literal("submit-result"),
    messageId: z.string(),
    accepted: z.boolean(),
    errorCode: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
  })
  .strict();

export const HostToPluginPayloadSchema = z.discriminatedUnion("type", [
  InitPayloadSchema,
  PingPayloadSchema,
  StateSyncPayloadSchema,
  ValidateInteractionResultPayloadSchema,
  SubmitResultPayloadSchema,
]);

export const HostToPluginEnvelopeSchema = PluginEnvelopeBaseSchema.extend({
  payload: HostToPluginPayloadSchema,
}).strict();

export const PluginInitEnvelopeSchema = PluginEnvelopeBaseSchema.extend({
  payload: InitPayloadSchema,
}).strict();

export type HostToPluginPayload = z.infer<typeof HostToPluginPayloadSchema>;

export type PluginToHostPayload =
  | { type: "ready" }
  | { type: "pong" }
  | { type: "state-ack"; syncId: number; clientReceivedAtMs?: number }
  | {
      type: "state-rendered";
      syncId: number;
      clientReceivedAtMs?: number;
      clientRenderedAtMs?: number;
    }
  | {
      type: "validate-interaction";
      playerId: string;
      interactionId: string;
      params: unknown;
      messageId: string;
    }
  | {
      type: "interaction";
      playerId: string;
      interactionId: string;
      params: unknown;
      clientActionId?: string;
      messageId: string;
      clientSubmittedAtMs: number;
    }
  | { type: "switch-player"; playerId: string }
  | { type: "restore-history"; entryId: string }
  | { type: "mark-notification-read"; notificationId: string }
  | { type: "error"; message: string; code: string };

export type PluginChannel = {
  channelId: string;
  hostOrigin: string;
  hostWindow: Window;
};

export function assertTransportEnvelopeWithinLimits(value: unknown): void {
  assertJsonWithinLimits(value, TRANSPORT_JSON_LIMITS, "Plugin message");
}

export function createPluginEnvelope(
  payload: PluginToHostPayload,
  channel: PluginChannel,
) {
  return {
    protocol: DREAMBOARD_PLUGIN_PROTOCOL,
    version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
    channelId: channel.channelId,
    payload,
  } as const;
}
