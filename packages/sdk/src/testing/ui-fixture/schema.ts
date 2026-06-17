import { z } from "zod";
import {
  BROWSER_INTERACTION_ACTUATOR_KINDS,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
  browserInteractionEffectSchema,
} from "../../browser-interaction/index.js";
import type {
  BrowserInteractionEffectRequest,
  BrowserInteractionIntentRequest,
} from "../../browser-interaction/index.js";
import { RuntimeJsonSchema } from "../../runtime-json.js";
import { digestUIFixtureRequest, isSha256Digest } from "./canonical.js";
import {
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION as PLUGIN_RUNTIME_PROTOCOL_VERSION,
  PluginProtocolFrameSchema,
  PluginProtocolStepSchema,
  PluginProtocolTapeSchema,
  type PluginProtocolFrame,
  type PluginProtocolStep,
  type PluginProtocolTape as RuntimePluginProtocolTape,
} from "@dreamboard-games/plugin-runtime-contract";

export const UI_SCENARIO_FIXTURE_SCHEMA_VERSION = 2;
export const UI_SCENARIO_FIXTURE_BUNDLE_SCHEMA_VERSION = 2;
export const UI_SCENARIO_FIXTURE_SUPPORTED_BROWSER_PROTOCOL_MAJOR = 3;
export const UI_SCENARIO_FIXTURE_PLUGIN_RUNTIME_PROTOCOL =
  PLUGIN_RUNTIME_PROTOCOL_VERSION;

const digestSchema = z.string().refine(isSha256Digest, {
  message: "Expected a sha256:<64 lowercase hex> digest.",
});

const nonEmptyStringSchema = z.string().min(1);
const jsonSchema = RuntimeJsonSchema;

const environmentSchema = z
  .object({
    clockIso: nonEmptyStringSchema,
    randomSeed: nonEmptyStringSchema,
    locale: z.literal("en-US"),
    timezone: z.literal("UTC"),
    viewportTags: z.array(z.enum(["desktop", "tablet", "phone", "touch"])),
  })
  .strict();

export const uiFixtureFrameSchema = PluginProtocolFrameSchema;
export const uiFixtureProtocolStepSchema = PluginProtocolStepSchema;
export const pluginProtocolTapeSchema = PluginProtocolTapeSchema.refine(
  (tape) => tape.frames.length > 0,
  "UI fixture protocol tapes require at least one gameplay frame.",
);

const browserInteractionIntentRequestSchema = z
  .object({
    surface: nonEmptyStringSchema,
    scopeId: nonEmptyStringSchema.optional(),
    interactionKey: nonEmptyStringSchema.optional(),
    interactionId: nonEmptyStringSchema.optional(),
    intent: nonEmptyStringSchema,
    inputKey: nonEmptyStringSchema.optional(),
    candidateValue: jsonSchema.optional(),
    candidateValueKey: nonEmptyStringSchema.optional(),
    actuatorKind: z.enum(BROWSER_INTERACTION_ACTUATOR_KINDS).optional(),
    allowDisabled: z.boolean().optional(),
  })
  .strict();

const browserInteractionEffectRequestSchema = z
  .object({
    surface: nonEmptyStringSchema,
    scopeId: nonEmptyStringSchema.optional(),
    interactionKey: nonEmptyStringSchema.optional(),
    interactionId: nonEmptyStringSchema.optional(),
    effect: browserInteractionEffectSchema,
    allowDisabled: z.boolean().optional(),
  })
  .strict();

export const uiReplayRequestSchema = z.union([
  browserInteractionIntentRequestSchema,
  browserInteractionEffectRequestSchema,
]);

export const uiReplayExecutionSchema = z.union([
  z
    .object({
      kind: z.literal("activate"),
    })
    .strict(),
  z
    .object({
      kind: z.literal("fill"),
      value: z.string(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("drag"),
      target: browserInteractionEffectRequestSchema,
    })
    .strict(),
]);

export const uiStepExpectationSchema = z
  .object({
    frameId: nonEmptyStringSchema.optional(),
    projectionDigest: digestSchema.optional(),
    semanticDigest: digestSchema.optional(),
    draftDigest: digestSchema.optional(),
    submissionDigest: digestSchema.optional(),
    focusedInteractionKey: nonEmptyStringSchema.optional(),
    visibleInteractionKeys: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const uiResolvedReplayIdentitySchema = z
  .object({
    stepId: nonEmptyStringSchema,
    surface: nonEmptyStringSchema,
    scopeId: nonEmptyStringSchema,
    interactionKey: nonEmptyStringSchema,
    interactionId: nonEmptyStringSchema,
    actuatorId: nonEmptyStringSchema,
    descriptorDigest: digestSchema.optional(),
    draftDigest: digestSchema.optional(),
  })
  .strict();

export const portableSemanticReplayStepSchema = z
  .object({
    stepId: nonEmptyStringSchema,
    requestDigest: digestSchema,
    resolve: uiReplayRequestSchema,
    execute: uiReplayExecutionSchema,
    expectedIdentity: uiResolvedReplayIdentitySchema.optional(),
    expect: uiStepExpectationSchema,
  })
  .strict();

export const uiScenarioReplayStepSchema = z.union([
  portableSemanticReplayStepSchema,
  z
    .object({
      stepId: nonEmptyStringSchema,
      kind: z.literal("assert"),
      expect: uiStepExpectationSchema,
    })
    .strict(),
]);

export const uiScenarioFixtureSchema = z
  .object({
    schemaVersion: z.literal(UI_SCENARIO_FIXTURE_SCHEMA_VERSION),
    browserInteractionProtocol: z.literal(
      DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
    ),
    pluginRuntimeProtocol: z.literal(PLUGIN_RUNTIME_PROTOCOL_VERSION),
    id: nonEmptyStringSchema,
    title: nonEmptyStringSchema,
    gameId: nonEmptyStringSchema,
    tags: z.array(nonEmptyStringSchema),
    source: z
      .object({
        scenarioId: nonEmptyStringSchema,
        reducerFingerprint: nonEmptyStringSchema,
        uiContractFingerprint: nonEmptyStringSchema,
        renderModule: nonEmptyStringSchema,
        renderModuleDigest: digestSchema,
        sourceDigest: digestSchema,
      })
      .strict(),
    viewer: z
      .object({
        seatId: nonEmptyStringSchema,
        playerId: nonEmptyStringSchema.optional(),
      })
      .strict(),
    environment: environmentSchema,
    protocol: pluginProtocolTapeSchema,
    replay: z.array(uiScenarioReplayStepSchema),
    expected: z
      .object({
        initialProjectionDigest: digestSchema,
        finalProjectionDigest: digestSchema,
        finalSemanticDigest: digestSchema,
        submissionDigest: digestSchema,
      })
      .strict(),
  })
  .strict();

export const uiScenarioFixtureBundleIndexSchema = z
  .object({
    schemaVersion: z.literal(UI_SCENARIO_FIXTURE_BUNDLE_SCHEMA_VERSION),
    bundleId: nonEmptyStringSchema,
    sdkCommit: nonEmptyStringSchema,
    pluginRuntimeProtocol: z.literal(PLUGIN_RUNTIME_PROTOCOL_VERSION),
    browserInteractionProtocol: z.literal(
      DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
    ),
    fixtures: z.array(
      z
        .object({
          id: nonEmptyStringSchema,
          file: nonEmptyStringSchema,
          sha256: digestSchema,
          renderModule: nonEmptyStringSchema,
          renderModuleSha256: digestSchema,
          components: z.array(nonEmptyStringSchema),
          capabilities: z.array(nonEmptyStringSchema),
        })
        .strict(),
    ),
  })
  .strict();

export type UIReplayRequest =
  | BrowserInteractionIntentRequest
  | BrowserInteractionEffectRequest;
export type UIReplayExecution = z.infer<typeof uiReplayExecutionSchema>;
export type UIStepExpectation = z.infer<typeof uiStepExpectationSchema>;
export type UIResolvedReplayIdentity = z.infer<
  typeof uiResolvedReplayIdentitySchema
>;
export type PortableSemanticReplayStep = z.infer<
  typeof portableSemanticReplayStepSchema
>;
export type UIScenarioReplayStep = z.infer<typeof uiScenarioReplayStepSchema>;
export type UIFixtureFrame = PluginProtocolFrame;
export type UIFixtureProtocolStep = PluginProtocolStep;
export type PluginProtocolTape = RuntimePluginProtocolTape;
export type UIScenarioFixture = Omit<
  z.infer<typeof uiScenarioFixtureSchema>,
  "protocol" | "replay"
> & {
  readonly protocol: PluginProtocolTape;
  readonly replay: readonly UIScenarioReplayStep[];
};
export type UIScenarioFixtureBundleIndex = z.infer<
  typeof uiScenarioFixtureBundleIndexSchema
>;

export function parseUIScenarioFixture(value: unknown): UIScenarioFixture {
  const fixture = uiScenarioFixtureSchema.parse(
    value,
  ) as unknown as UIScenarioFixture;
  validateUIScenarioFixtureReferences(fixture);
  return fixture;
}

export function parseUIScenarioFixtureBundleIndex(
  value: unknown,
): UIScenarioFixtureBundleIndex {
  const bundle = uiScenarioFixtureBundleIndexSchema.parse(value);
  assertSupportedBrowserInteractionProtocol(bundle.browserInteractionProtocol);
  const ids = new Set<string>();
  for (const entry of bundle.fixtures) {
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate fixture id '${entry.id}' in bundle index.`);
    }
    ids.add(entry.id);
  }
  return bundle;
}

export function assertSupportedBrowserInteractionProtocol(
  version: string,
): void {
  const major = Number(version.split(".")[0]);
  if (major !== UI_SCENARIO_FIXTURE_SUPPORTED_BROWSER_PROTOCOL_MAJOR) {
    throw new Error(
      `Unsupported browser-interaction protocol '${version}'. Expected major ${UI_SCENARIO_FIXTURE_SUPPORTED_BROWSER_PROTOCOL_MAJOR}.`,
    );
  }
}

function validateUIScenarioFixtureReferences(fixture: UIScenarioFixture): void {
  assertSupportedBrowserInteractionProtocol(fixture.browserInteractionProtocol);
  const frameIds = new Set<string>();
  const stepIds = new Set<string>();

  for (const frame of fixture.protocol.frames) {
    if (frameIds.has(frame.id)) {
      throw new Error(`Duplicate fixture frame id '${frame.id}'.`);
    }
    frameIds.add(frame.id);
  }

  for (const step of fixture.protocol.steps) {
    if (stepIds.has(step.id)) {
      throw new Error(`Duplicate protocol step id '${step.id}'.`);
    }
    stepIds.add(step.id);
    if (step.kind === "host.frame") {
      if (!frameIds.has(step.frameId)) {
        throw new Error(
          `Protocol step '${step.id}' references missing frameId '${step.frameId}'.`,
        );
      }
      continue;
    }
    if (!frameIds.has(step.fromFrameId)) {
      throw new Error(
        `Protocol step '${step.id}' references missing fromFrameId '${step.fromFrameId}'.`,
      );
    }
  }

  for (const step of fixture.replay) {
    if ("resolve" in step) {
      const actualDigest = digestUIFixtureRequest(
        step.resolve as unknown as UIReplayRequest,
      );
      if (step.requestDigest !== actualDigest) {
        throw new Error(
          `Replay step '${step.stepId}' requestDigest ${step.requestDigest} does not match ${actualDigest}.`,
        );
      }
    }
    const expectedFrameId = step.expect.frameId;
    if (expectedFrameId && !frameIds.has(expectedFrameId)) {
      throw new Error(
        `Replay step '${step.stepId}' expects missing frameId '${expectedFrameId}'.`,
      );
    }
  }
}
