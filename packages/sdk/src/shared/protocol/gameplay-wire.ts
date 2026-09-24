import { z } from "zod";
import {
  InteractionResultSchema,
  PluginGameplayFrameSchema,
  BoardStaticProjectionSchema,
  SubmitInteractionCommandSchema,
  CancelInteractionCommandSchema,
} from "./schema.js";
export const GameplayCloseCode = {
  GoingAway: 1001,
  CredentialExpired: 4000,
  CredentialInvalid: 4001,
  RefreshContextMismatch: 4002,
  PermissionDenied: 4100,
  ProtocolViolation: 4200,
  FrameBeforeAuth: 4201,
  SlowConsumer: 4300,
  TooManyRequests: 4301,
} as const;

export const GameplayCredentialSchema = z.discriminatedUnion("kind", [
  z
    .object({ kind: z.literal("user"), token: z.string().min(1).max(16384) })
    .strict(),
  z
    .object({ kind: z.literal("demo"), secret: z.string().min(1).max(1024) })
    .strict(),
]);
export const AuthConnectFrameSchema = z
  .object({
    type: z.literal("auth.connect"),
    credential: GameplayCredentialSchema,
    sessionId: z.string().uuid(),
    playerId: z.string().min(1).max(128),
  })
  .strict();
export const AuthRefreshFrameSchema = z
  .object({
    type: z.literal("auth.refresh"),
    credential: GameplayCredentialSchema,
  })
  .strict();

export const SessionResumeFrameSchema = z.object({
  type: z.literal("session.resume"),
  lastSeenLogCursor: z.number().int().nonnegative().nullable(),
  unacknowledgedClientActionIds: z.array(z.string().min(1)).max(32),
});

export const AuthAcceptedFrameSchema = z.object({
  type: z.literal("auth.accepted"),
  expiresAt: z.string().datetime(),
});

export const GameplayBackpressureReasonSchema = z.enum([
  "queue_full",
  "capacity_full",
]);

export const GameplayBackpressureOperationSchema = z.enum([
  "session.resume",
  "interaction.submit",
  "interaction.cancel",
]);
export const GameplayBackpressureFrameSchema = z.object({
  type: z.literal("gameplay.backpressure"),
  reason: GameplayBackpressureReasonSchema,
  retryAfterMs: z.number().int().positive(),
  message: z.string().min(1),
  operation: GameplayBackpressureOperationSchema,
  clientActionId: z.string().min(1).optional(),
});
export const SessionSnapshotFrameSchema = z.object({
  type: z.literal("session.snapshot"),
  frame: PluginGameplayFrameSchema,
  boardStatic: BoardStaticProjectionSchema.nullable(),
});
export const ClientGameplayFrameSchema = z.discriminatedUnion("type", [
  AuthConnectFrameSchema,
  AuthRefreshFrameSchema,
  SessionResumeFrameSchema,
  SubmitInteractionCommandSchema,
  CancelInteractionCommandSchema,
]);
export const ServerGameplayFrameSchema = z.discriminatedUnion("type", [
  AuthAcceptedFrameSchema,
  GameplayBackpressureFrameSchema,
  SessionSnapshotFrameSchema,
  InteractionResultSchema,
]);
export type GameplayCredential = z.infer<typeof GameplayCredentialSchema>;
export type ClientGameplayFrame = z.infer<typeof ClientGameplayFrameSchema>;
export type ServerGameplayFrame = z.infer<typeof ServerGameplayFrameSchema>;
