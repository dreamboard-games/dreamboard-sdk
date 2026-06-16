import {
  canonicalizeUIScenarioFixture,
  digestUIFixtureJson,
  serializeUIScenarioFixture,
} from "./canonical.js";
import { DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION } from "../../browser-interaction/index.js";
import {
  parseUIScenarioFixture,
  type PortableSemanticReplayStep,
  type UIFixtureFrame,
  type UIFixtureTransportExchange,
  type UIResolvedReplayIdentity,
  type UIScenarioFixture,
  type UIScenarioReplayStep,
  type UIStepExpectation,
} from "./schema.js";

export interface CompileUIScenarioFixtureOptions {
  readonly id: string;
  readonly title: string;
  readonly gameId: string;
  readonly tags?: readonly string[];
  readonly source: UIScenarioFixture["source"];
  readonly viewer: UIScenarioFixture["viewer"];
  readonly environment: UIScenarioFixture["environment"];
  readonly frames: readonly UIFixtureFrame[];
  readonly transport?: readonly UIFixtureTransportExchange[];
  readonly replay?: readonly UIScenarioReplayStep[];
  readonly expected?: Partial<UIScenarioFixture["expected"]>;
}

export type UIReplayIdentityCandidate = UIResolvedReplayIdentity;

export function compileUIScenarioFixture(
  options: CompileUIScenarioFixtureOptions,
): UIScenarioFixture {
  const firstFrame = options.frames[0];
  const finalFrame = options.frames[options.frames.length - 1];
  if (!firstFrame || !finalFrame) {
    throw new Error("compileUIScenarioFixture requires at least one frame.");
  }

  const replay = options.replay ?? [];
  const submissionDigest =
    options.expected?.submissionDigest ??
    digestUIFixtureJson({
      digestVersion: "ui-submission@1",
      fixtureId: options.id,
      replay: replay.map((step) =>
        "requestDigest" in step ? step.requestDigest : step.stepId,
      ),
    });
  const finalSemanticDigest =
    options.expected?.finalSemanticDigest ??
    digestUIFixtureJson({
      digestVersion: "ui-semantic@1",
      fixtureId: options.id,
      frameId: finalFrame.id,
      projectionDigest: finalFrame.projectionDigest,
    });

  return parseUIScenarioFixture(
    canonicalizeUIScenarioFixture({
      schemaVersion: 1,
      browserInteractionProtocol:
        DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
      id: options.id,
      title: options.title,
      gameId: options.gameId,
      tags: [...(options.tags ?? [])],
      source: options.source,
      viewer: options.viewer,
      environment: options.environment,
      frames: options.frames,
      transport: [...(options.transport ?? [])],
      replay,
      expected: {
        initialProjectionDigest:
          options.expected?.initialProjectionDigest ??
          firstFrame.projectionDigest,
        finalProjectionDigest:
          options.expected?.finalProjectionDigest ??
          finalFrame.projectionDigest,
        finalSemanticDigest,
        submissionDigest,
      },
    }),
  );
}

export function assertDeterministicUIScenarioFixture(
  first: UIScenarioFixture,
  second: UIScenarioFixture,
): void {
  const firstBytes = serializeUIScenarioFixture(first);
  const secondBytes = serializeUIScenarioFixture(second);
  if (firstBytes !== secondBytes) {
    throw new Error(
      `UI scenario fixture '${first.id}' is non-deterministic across compilation runs.`,
    );
  }
}

export function assertUniqueReplayIdentity(
  step: Pick<PortableSemanticReplayStep, "stepId" | "expectedIdentity">,
  candidates: readonly UIReplayIdentityCandidate[],
): UIReplayIdentityCandidate {
  if (candidates.length !== 1) {
    throw new Error(
      `Replay step '${step.stepId}' resolved ${candidates.length} identities; expected exactly one.`,
    );
  }
  const candidate = candidates[0];
  if (!candidate) {
    throw new Error(`Replay step '${step.stepId}' did not resolve.`);
  }

  const expected = step.expectedIdentity;
  if (!expected) {
    return candidate;
  }
  for (const key of [
    "surface",
    "scopeId",
    "interactionKey",
    "interactionId",
    "actuatorId",
    "descriptorDigest",
    "draftDigest",
  ] as const) {
    const expectedValue = expected[key];
    if (expectedValue !== undefined && candidate[key] !== expectedValue) {
      throw new Error(
        `Replay step '${step.stepId}' resolved ${key} '${String(
          candidate[key],
        )}', expected '${expectedValue}'.`,
      );
    }
  }
  return candidate;
}

export function assertUIStepExpectationSatisfied(
  stepId: string,
  expected: UIStepExpectation,
  actual: UIStepExpectation,
): void {
  for (const key of [
    "frameId",
    "projectionDigest",
    "semanticDigest",
    "draftDigest",
    "submissionDigest",
    "focusedInteractionKey",
  ] as const) {
    if (expected[key] !== undefined && expected[key] !== actual[key]) {
      throw new Error(
        `Replay step '${stepId}' expected ${key} '${expected[key]}', received '${actual[key]}'.`,
      );
    }
  }
  if (expected.visibleInteractionKeys) {
    const actualKeys = new Set(actual.visibleInteractionKeys ?? []);
    const missing = expected.visibleInteractionKeys.filter(
      (key) => !actualKeys.has(key),
    );
    if (missing.length > 0) {
      throw new Error(
        `Replay step '${stepId}' missing visible interactions: ${missing.join(
          ", ",
        )}.`,
      );
    }
  }
}
