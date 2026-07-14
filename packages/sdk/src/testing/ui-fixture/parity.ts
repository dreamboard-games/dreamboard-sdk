import {
  canonicalUIFixtureJson,
  digestUIFixtureJson,
  digestUIScenarioFixture,
} from "./canonical.js";
import type { UIScenarioFixture } from "./schema.js";

export interface UIParityViewport {
  readonly width: number;
  readonly height: number;
}

export interface UIParityObservationEnvironmentV1 {
  readonly project: string;
  readonly viewport: UIParityViewport;
}

export interface UIParityDiagnosticV1 {
  readonly code: string;
  readonly message: string;
}

export interface UIParityObservationCheckpointV1 {
  readonly stepId: string;
  readonly interactionKey?: string;
  readonly interactionId?: string;
  readonly actuatorId?: string;
  readonly descriptorDigest?: string;
  readonly draftDigest?: string;
  readonly gameVersion: number;
  readonly actionSetVersion: string;
  readonly perspectivePlayerId: string | null;
  readonly projectionDigest: string;
  readonly semanticDigest: string;
  readonly submissionDigest?: string;
  readonly screenshot?: string;
}

export interface UIParityObservationProvenanceV1 {
  readonly kind:
    | "fixture-expectation"
    | "source-workbench"
    | "packed-real-host";
  readonly evidence?: string;
}

export interface UIParityObservationV1 {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly fixtureDigest: string;
  readonly sdkCandidateDigest: string;
  readonly pluginRuntimeProtocol: 3;
  readonly browserInteractionProtocol: string;
  readonly environment: UIParityObservationEnvironmentV1;
  readonly provenance: UIParityObservationProvenanceV1;
  readonly checkpoints: readonly UIParityObservationCheckpointV1[];
  readonly diagnostics: readonly UIParityDiagnosticV1[];
}

export type UIParityFailureCode =
  | "candidate-mismatch"
  | "fixture-source-mismatch"
  | "protocol-mismatch"
  | "interaction-resolution-mismatch"
  | "preparation-mismatch"
  | "draft-mismatch"
  | "submission-mismatch"
  | "projection-mismatch"
  | "semantic-snapshot-mismatch"
  | "visual-mismatch"
  | "host-setup-failure";

export interface UIParityComparisonFailure {
  readonly code: UIParityFailureCode;
  readonly message: string;
  readonly path: string;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly checkpointIndex?: number;
  readonly stepId?: string;
}

export type UIParityComparisonResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly failure: UIParityComparisonFailure;
    };

type UIParityComparisonFailureInput = Omit<
  UIParityComparisonFailure,
  "message"
>;

export interface CreateUIParityObservationFromFixtureOptions {
  readonly fixture: UIScenarioFixture;
  readonly sdkCandidateDigest: string;
  readonly environment: UIParityObservationEnvironmentV1;
  readonly fixtureDigest?: string;
  readonly screenshotsByStepId?: Readonly<Record<string, string>>;
  readonly diagnostics?: readonly UIParityDiagnosticV1[];
}

type ComparablePath = {
  readonly path: string;
  readonly code: UIParityFailureCode;
};

const topLevelComparisons: readonly ComparablePath[] = [
  { path: "scenarioId", code: "fixture-source-mismatch" },
  { path: "fixtureDigest", code: "candidate-mismatch" },
  { path: "sdkCandidateDigest", code: "candidate-mismatch" },
  { path: "pluginRuntimeProtocol", code: "protocol-mismatch" },
  { path: "browserInteractionProtocol", code: "protocol-mismatch" },
  { path: "environment.project", code: "host-setup-failure" },
  { path: "environment.viewport.width", code: "host-setup-failure" },
  { path: "environment.viewport.height", code: "host-setup-failure" },
];

const checkpointComparisons: readonly ComparablePath[] = [
  { path: "stepId", code: "interaction-resolution-mismatch" },
  { path: "interactionKey", code: "interaction-resolution-mismatch" },
  { path: "interactionId", code: "interaction-resolution-mismatch" },
  { path: "actuatorId", code: "interaction-resolution-mismatch" },
  { path: "descriptorDigest", code: "interaction-resolution-mismatch" },
  { path: "gameVersion", code: "projection-mismatch" },
  { path: "actionSetVersion", code: "projection-mismatch" },
  { path: "perspectivePlayerId", code: "projection-mismatch" },
  { path: "projectionDigest", code: "projection-mismatch" },
  { path: "semanticDigest", code: "semantic-snapshot-mismatch" },
  { path: "draftDigest", code: "draft-mismatch" },
  { path: "submissionDigest", code: "submission-mismatch" },
  { path: "screenshot", code: "visual-mismatch" },
];

export function createUIParityObservationFromFixture({
  fixture,
  sdkCandidateDigest,
  environment,
  fixtureDigest = digestUIScenarioFixture(fixture),
  screenshotsByStepId = {},
  diagnostics = [],
}: CreateUIParityObservationFromFixtureOptions): UIParityObservationV1 {
  const frameById = new Map(
    fixture.protocol.frames.map((frame) => [frame.id, frame]),
  );
  const firstFrame = fixture.protocol.frames[0];
  if (!firstFrame) {
    throw new Error(
      `Fixture '${fixture.id}' does not contain protocol frames.`,
    );
  }

  const checkpoints = fixture.replay.map((step, index) => {
    const expectedFrameId = step.expect.frameId ?? firstFrame.id;
    const frame = frameById.get(expectedFrameId);
    if (!frame) {
      throw new Error(
        `Fixture '${fixture.id}' replay step '${step.stepId}' references missing frame '${expectedFrameId}'.`,
      );
    }
    const identity = "expectedIdentity" in step ? step.expectedIdentity : null;
    const projectionDigest =
      step.expect.projectionDigest ?? frame.projectionDigest;
    const isFinal = index === fixture.replay.length - 1;
    const semanticDigest =
      step.expect.semanticDigest ??
      (isFinal
        ? fixture.expected.finalSemanticDigest
        : digestUIFixtureJson({
            scenarioId: fixture.id,
            stepId: step.stepId,
            frameId: frame.id,
            projectionDigest,
          }));
    const submissionDigest =
      step.expect.submissionDigest ??
      (isFinal ? fixture.expected.submissionDigest : undefined);

    return {
      stepId: step.stepId,
      interactionKey: identity?.interactionKey,
      interactionId: identity?.interactionId,
      actuatorId: identity?.actuatorId,
      descriptorDigest: identity?.descriptorDigest,
      draftDigest: step.expect.draftDigest ?? identity?.draftDigest,
      gameVersion: frame.frame.gameVersion,
      actionSetVersion: frame.frame.actionSetVersion,
      perspectivePlayerId: frame.frame.perspectivePlayerId,
      projectionDigest,
      semanticDigest,
      submissionDigest,
      screenshot: screenshotsByStepId[step.stepId],
    } satisfies UIParityObservationCheckpointV1;
  });

  return {
    schemaVersion: 1,
    scenarioId: fixture.id,
    fixtureDigest,
    sdkCandidateDigest,
    pluginRuntimeProtocol: fixture.pluginRuntimeProtocol,
    browserInteractionProtocol: fixture.browserInteractionProtocol,
    environment,
    provenance: {
      kind: "fixture-expectation",
    },
    checkpoints,
    diagnostics,
  };
}

export function parseUIParityObservationV1(
  value: unknown,
): UIParityObservationV1 {
  const observation = assertRecord(value, "observation");
  if (observation.schemaVersion !== 1) {
    throw new Error("UI parity observation schemaVersion must be 1.");
  }
  assertString(observation.scenarioId, "scenarioId");
  assertString(observation.fixtureDigest, "fixtureDigest");
  assertString(observation.sdkCandidateDigest, "sdkCandidateDigest");
  if (observation.pluginRuntimeProtocol !== 3) {
    throw new Error("UI parity observation pluginRuntimeProtocol must be 3.");
  }
  assertString(
    observation.browserInteractionProtocol,
    "browserInteractionProtocol",
  );
  const environment = assertRecord(observation.environment, "environment");
  assertString(environment.project, "environment.project");
  const viewport = assertRecord(environment.viewport, "environment.viewport");
  assertNumber(viewport.width, "environment.viewport.width");
  assertNumber(viewport.height, "environment.viewport.height");
  const provenance = assertRecord(
    observation.provenance,
    "observation.provenance",
  );
  if (
    provenance.kind !== "fixture-expectation" &&
    provenance.kind !== "source-workbench" &&
    provenance.kind !== "packed-real-host"
  ) {
    throw new Error(
      "observation.provenance.kind must identify fixture, source Workbench, or packed real-host measurement.",
    );
  }
  assertOptionalString(provenance.evidence, "observation.provenance.evidence");
  const checkpoints = assertArray(observation.checkpoints, "checkpoints");
  for (let index = 0; index < checkpoints.length; index += 1) {
    const checkpoint = assertRecord(
      checkpoints[index],
      `checkpoints[${index}]`,
    );
    assertString(checkpoint.stepId, `checkpoints[${index}].stepId`);
    assertOptionalString(
      checkpoint.interactionKey,
      `checkpoints[${index}].interactionKey`,
    );
    assertOptionalString(
      checkpoint.interactionId,
      `checkpoints[${index}].interactionId`,
    );
    assertOptionalString(
      checkpoint.actuatorId,
      `checkpoints[${index}].actuatorId`,
    );
    assertOptionalString(
      checkpoint.descriptorDigest,
      `checkpoints[${index}].descriptorDigest`,
    );
    assertOptionalString(
      checkpoint.draftDigest,
      `checkpoints[${index}].draftDigest`,
    );
    assertNumber(checkpoint.gameVersion, `checkpoints[${index}].gameVersion`);
    assertString(
      checkpoint.actionSetVersion,
      `checkpoints[${index}].actionSetVersion`,
    );
    if (
      checkpoint.perspectivePlayerId !== null &&
      typeof checkpoint.perspectivePlayerId !== "string"
    ) {
      throw new Error(
        `checkpoints[${index}].perspectivePlayerId must be a string or null.`,
      );
    }
    assertString(
      checkpoint.projectionDigest,
      `checkpoints[${index}].projectionDigest`,
    );
    assertString(
      checkpoint.semanticDigest,
      `checkpoints[${index}].semanticDigest`,
    );
    assertOptionalString(
      checkpoint.submissionDigest,
      `checkpoints[${index}].submissionDigest`,
    );
    assertOptionalString(
      checkpoint.screenshot,
      `checkpoints[${index}].screenshot`,
    );
  }
  const diagnostics = assertArray(observation.diagnostics, "diagnostics");
  for (let index = 0; index < diagnostics.length; index += 1) {
    const diagnostic = assertRecord(
      diagnostics[index],
      `diagnostics[${index}]`,
    );
    assertString(diagnostic.code, `diagnostics[${index}].code`);
    assertString(diagnostic.message, `diagnostics[${index}].message`);
  }
  return observation as unknown as UIParityObservationV1;
}

export function compareUIParityObservations(
  expected: UIParityObservationV1,
  actual: UIParityObservationV1,
): UIParityComparisonResult {
  for (const comparison of topLevelComparisons) {
    const result = comparePath(expected, actual, comparison);
    if (result) {
      return result;
    }
  }

  if (expected.checkpoints.length !== actual.checkpoints.length) {
    return mismatch({
      code: "interaction-resolution-mismatch",
      path: "checkpoints.length",
      expected: expected.checkpoints.length,
      actual: actual.checkpoints.length,
    });
  }

  for (let index = 0; index < expected.checkpoints.length; index += 1) {
    const expectedCheckpoint = expected.checkpoints[index]!;
    const actualCheckpoint = actual.checkpoints[index]!;
    for (const comparison of checkpointComparisons) {
      const result = comparePath(
        expectedCheckpoint,
        actualCheckpoint,
        comparison,
        {
          prefix: `checkpoints[${index}]`,
          checkpointIndex: index,
          stepId: expectedCheckpoint.stepId,
        },
      );
      if (result) {
        return result;
      }
    }
  }

  if (!sameValue(expected.diagnostics, actual.diagnostics)) {
    return mismatch({
      code: "host-setup-failure",
      path: "diagnostics",
      expected: expected.diagnostics,
      actual: actual.diagnostics,
    });
  }

  return { ok: true };
}

function comparePath(
  expected: unknown,
  actual: unknown,
  comparison: ComparablePath,
  options: {
    readonly prefix?: string;
    readonly checkpointIndex?: number;
    readonly stepId?: string;
  } = {},
): UIParityComparisonResult | null {
  const expectedValue = getPath(expected, comparison.path);
  const actualValue = getPath(actual, comparison.path);
  if (sameValue(expectedValue, actualValue)) {
    return null;
  }
  const path = options.prefix
    ? `${options.prefix}.${comparison.path}`
    : comparison.path;
  return mismatch({
    code: comparison.code,
    path,
    expected: expectedValue,
    actual: actualValue,
    checkpointIndex: options.checkpointIndex,
    stepId: options.stepId,
  });
}

function mismatch(
  input: UIParityComparisonFailureInput,
): UIParityComparisonResult {
  return {
    ok: false,
    failure: {
      ...input,
      message: `${input.code} at ${input.path}`,
    },
  };
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }
  return canonicalUIFixtureJson(left) === canonicalUIFixtureJson(right);
}

function getPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, value);
}

function assertRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array.`);
  }
  return value;
}

function assertString(value: unknown, path: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${path} must be a non-empty string.`);
  }
}

function assertOptionalString(value: unknown, path: string): void {
  if (
    value !== undefined &&
    (typeof value !== "string" || value.length === 0)
  ) {
    throw new Error(`${path} must be a non-empty string when present.`);
  }
}

function assertNumber(value: unknown, path: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number.`);
  }
}
