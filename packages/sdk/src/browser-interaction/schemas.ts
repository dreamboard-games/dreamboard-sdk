import { z } from "zod";
import {
  BROWSER_INTERACTION_ACTUATOR_KINDS,
  BROWSER_INTERACTION_CANDIDATE_STATES,
  BROWSER_INTERACTION_READINESS_VALUES,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_NAME,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
  GAMEPLAY_BROWSER_INTERACTION_SURFACE,
} from "./constants.js";

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const browserInteractionEffectSchema = z
  .object({
    kind: z.string().min(1),
  })
  .catchall(jsonValueSchema);

export const browserInteractionEffectPatternSchema = z.union([
  z.object({
    kind: z.literal("exact"),
    effect: browserInteractionEffectSchema,
  }),
  z.object({
    kind: z.literal("match"),
    effectKind: z.string().min(1),
    fields: z.record(z.string(), jsonValueSchema).optional(),
    scalar: z
      .object({
        field: z.string().min(1),
        min: z.number().finite().optional(),
        max: z.number().finite().optional(),
        integer: z.boolean().optional(),
      })
      .optional(),
  }),
]);

export const gameplaySemanticEffectSchema = z.union([
  z.object({
    kind: z.literal("setCandidate"),
    inputKey: z.string(),
    candidateValue: jsonValueSchema,
    beforeSelected: z.boolean(),
    afterSelected: z.boolean(),
  }),
  z.object({
    kind: z.literal("adjustResource"),
    inputKey: z.string(),
    resourceKey: jsonValueSchema,
    delta: z.union([z.literal(-1), z.literal(1)]),
  }),
  z.object({
    kind: z.literal("setScalar"),
    inputKey: z.string(),
    value: z.number().finite(),
  }),
  z.object({
    kind: z.literal("commit"),
  }),
  z.object({
    kind: z.literal("invoke"),
  }),
]);

export const browserInteractionDiagnosticSchema = z.object({
  code: z.string(),
  severity: z.enum(["error", "warning"]),
  message: z.string(),
  surface: z.string().optional(),
  scopeId: z.string().optional(),
  interactionKey: z.string().optional(),
  intent: z.string().optional(),
  actuatorId: z.string().optional(),
});

export const browserInteractionActuatorSchema = z.object({
  actuatorId: z.string(),
  intent: z.string(),
  inputKey: z.string().optional(),
  candidateValue: jsonValueSchema.optional(),
  candidateValueKey: z.string().optional(),
  candidateState: z.enum(BROWSER_INTERACTION_CANDIDATE_STATES).optional(),
  enabled: z.boolean(),
  actuatorKind: z.enum(BROWSER_INTERACTION_ACTUATOR_KINDS),
  semanticEffects: z.array(browserInteractionEffectSchema),
  acceptedEffectPatterns: z.array(browserInteractionEffectPatternSchema),
  preparationPatterns: z.array(browserInteractionEffectPatternSchema),
  prepares: z
    .object({
      intent: z.string(),
      inputKey: z.string().optional(),
      candidateValue: jsonValueSchema.optional(),
      candidateValueKey: z.string().optional(),
      actuatorKind: z.enum(BROWSER_INTERACTION_ACTUATOR_KINDS).optional(),
    })
    .optional(),
  diagnostics: z.array(browserInteractionDiagnosticSchema),
});

export const browserGameplayInteractionSchema = z.object({
  interactionKey: z.string(),
  interactionId: z.string(),
  descriptorDigest: z.string().optional(),
  draftDigest: z.string().optional(),
  readiness: z.enum(BROWSER_INTERACTION_READINESS_VALUES),
  actuators: z.array(browserInteractionActuatorSchema),
  diagnostics: z.array(browserInteractionDiagnosticSchema),
});

export const browserGameplaySurfaceSnapshotSchema = z.object({
  surface: z.literal(GAMEPLAY_BROWSER_INTERACTION_SURFACE),
  scopeId: z.string(),
  interactions: z.array(browserGameplayInteractionSchema),
  diagnostics: z.array(browserInteractionDiagnosticSchema),
});

export const browserSemanticSurfaceSnapshotSchema = z.object({
  surface: z.string(),
  scopeId: z.string(),
  interactions: z.array(browserGameplayInteractionSchema),
  diagnostics: z.array(browserInteractionDiagnosticSchema),
});

export const browserUnknownSurfaceSnapshotSchema = z.object({
  surface: z.string(),
  scopeId: z.string(),
  diagnostics: z.array(browserInteractionDiagnosticSchema),
});

export const browserInteractionSnapshotSchema = z.object({
  protocol: z.object({
    name: z.literal(DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_NAME),
    version: z.literal(DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION),
  }),
  surfaces: z.array(
    z.union([
      browserSemanticSurfaceSnapshotSchema,
      browserUnknownSurfaceSnapshotSchema,
    ]),
  ),
  diagnostics: z.array(browserInteractionDiagnosticSchema),
});
