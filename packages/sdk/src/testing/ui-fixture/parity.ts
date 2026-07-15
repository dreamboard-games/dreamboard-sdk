import {
  canonicalUIFixtureJson,
  digestUIFixtureJson,
  digestUIScenarioFixture,
} from "./canonical.js";
import type { GameplayBasis } from "@dreamboard-games/plugin-runtime-contract";
import type { UIScenarioFixture } from "./schema.js";

export interface UIParityViewport {
  readonly width: number;
  readonly height: number;
}

export interface UIParityObservationEnvironment {
  readonly project: string;
  readonly viewport: UIParityViewport;
}

export interface UIParityDiagnostic {
  readonly code: string;
  readonly message: string;
}

export interface UIParityObservationCheckpoint {
  readonly stepId: string;
  readonly interactionKey?: string;
  readonly interactionId?: string;
  readonly actuatorId?: string;
  readonly descriptorDigest?: string;
  readonly draftDigest?: string;
  readonly basis: GameplayBasis;
  readonly projectionDigest: string;
  readonly semanticDigest: string;
  readonly submissionDigest?: string;
  readonly screenshot?: string;
}

export interface UIParityObservationProvenance {
  readonly kind:
    | "fixture-expectation"
    | "source-workbench"
    | "packed-real-host";
  readonly evidence?: string;
}

export interface UIParityObservation {
  readonly schemaVersion: 2;
  readonly scenarioId: string;
  readonly fixtureDigest: string;
  readonly sdkCandidateDigest: string;
  readonly pluginRuntimeProtocol: 4;
  readonly browserInteractionProtocol: string;
  readonly environment: UIParityObservationEnvironment;
  readonly provenance: UIParityObservationProvenance;
  readonly checkpoints: readonly UIParityObservationCheckpoint[];
  readonly diagnostics: readonly UIParityDiagnostic[];
}

export interface UIParityArtifactReference {
  readonly path: string;
  readonly sha256: string;
}

export interface UIParityRunScenario {
  readonly id: string;
  readonly fixture: UIParityArtifactReference;
  readonly renderModule: UIParityArtifactReference;
  readonly expectation: UIParityArtifactReference;
  readonly source: UIParityArtifactReference;
}

export interface UIParityRunInput {
  readonly schemaVersion: 2;
  readonly sdk: { readonly tarball: UIParityArtifactReference };
  readonly referenceBundle: UIParityArtifactReference;
  readonly fixtureBundle: {
    readonly index: UIParityArtifactReference;
    readonly scenarios: readonly UIParityRunScenario[];
  };
  readonly project: string;
}

export interface UIParityReceiptComparison {
  readonly scenarioId: string;
  readonly actual: string;
  readonly comparison: string;
  readonly evidence?: string;
}

export interface UIParityRealHostReceipt {
  readonly schemaVersion: 2;
  readonly kind: "dreamboard-ui-real-host-parity";
  readonly mode: "real-host-parity";
  readonly result: "passed";
  readonly realHostExecutor: true;
  readonly input: UIParityArtifactReference;
  readonly sdkTarballSha256: string;
  readonly fixtureBundleSha256: string;
  readonly scenarios: readonly {
    readonly id: string;
    readonly fixtureDigest: string;
  }[];
  readonly source: {
    readonly result: "passed";
    readonly comparisons: readonly UIParityReceiptComparison[];
  };
  readonly internal: {
    readonly result: "passed";
    readonly comparisons: ReadonlyArray<{
      readonly scenarioId: string;
      readonly actual: string;
      readonly expectationComparison: string;
      readonly sourceComparison: string;
    }>;
  };
  readonly project: string;
  readonly host: {
    readonly route: string;
    readonly pluginIframe: true;
    readonly pluginSessionGateway: true;
    readonly playwright: "chromium";
    readonly webLogPath: string;
  };
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
  readonly environment: UIParityObservationEnvironment;
  readonly fixtureDigest?: string;
  readonly screenshotsByStepId?: Readonly<Record<string, string>>;
  readonly diagnostics?: readonly UIParityDiagnostic[];
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
  { path: "basis.generation", code: "projection-mismatch" },
  { path: "basis.version", code: "projection-mismatch" },
  { path: "basis.actionSetVersion", code: "projection-mismatch" },
  { path: "basis.perspectivePlayerId", code: "projection-mismatch" },
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
}: CreateUIParityObservationFromFixtureOptions): UIParityObservation {
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
      basis: frame.frame.basis,
      projectionDigest,
      semanticDigest,
      submissionDigest,
      screenshot: screenshotsByStepId[step.stepId],
    } satisfies UIParityObservationCheckpoint;
  });

  return {
    schemaVersion: 2,
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

export function parseUIParityObservation(value: unknown): UIParityObservation {
  const observation = assertRecord(value, "observation");
  if (observation.schemaVersion !== 2) {
    throw new Error("UI parity observation schemaVersion must be 2.");
  }
  assertString(observation.scenarioId, "scenarioId");
  assertString(observation.fixtureDigest, "fixtureDigest");
  assertString(observation.sdkCandidateDigest, "sdkCandidateDigest");
  if (observation.pluginRuntimeProtocol !== 4) {
    throw new Error("UI parity observation pluginRuntimeProtocol must be 4.");
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
  if (typeof provenance.evidence === "string") {
    assertPortablePath(provenance.evidence, "observation.provenance.evidence");
  }
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
    parseGameplayBasis(checkpoint.basis, `checkpoints[${index}].basis`);
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
  return observation as unknown as UIParityObservation;
}

export function compareUIParityObservations(
  expected: UIParityObservation,
  actual: UIParityObservation,
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

export function parseUIParityRunInput(value: unknown): UIParityRunInput {
  const input = assertRecord(value, "input");
  if (input.schemaVersion !== 2) {
    throw new Error("UI parity run input schemaVersion must be 2.");
  }
  const sdk = assertRecord(input.sdk, "input.sdk");
  parseArtifactReference(sdk.tarball, "input.sdk.tarball");
  parseArtifactReference(input.referenceBundle, "input.referenceBundle");
  const fixtureBundle = assertRecord(
    input.fixtureBundle,
    "input.fixtureBundle",
  );
  parseArtifactReference(fixtureBundle.index, "input.fixtureBundle.index");
  const scenarios = assertArray(
    fixtureBundle.scenarios,
    "input.fixtureBundle.scenarios",
  );
  if (scenarios.length === 0) {
    throw new Error("input.fixtureBundle.scenarios must not be empty.");
  }
  const ids = new Set<string>();
  for (let index = 0; index < scenarios.length; index += 1) {
    const path = `input.fixtureBundle.scenarios[${index}]`;
    const scenario = assertRecord(scenarios[index], path);
    assertString(scenario.id, `${path}.id`);
    const id = scenario.id as string;
    if (ids.has(id)) {
      throw new Error(`${path}.id duplicates scenario '${id}'.`);
    }
    ids.add(id);
    parseArtifactReference(scenario.fixture, `${path}.fixture`);
    parseArtifactReference(scenario.renderModule, `${path}.renderModule`);
    parseArtifactReference(scenario.expectation, `${path}.expectation`);
    parseArtifactReference(scenario.source, `${path}.source`);
  }
  assertString(input.project, "input.project");
  return input as unknown as UIParityRunInput;
}

export function parseUIParityRealHostReceipt(
  value: unknown,
): UIParityRealHostReceipt {
  const receipt = assertRecord(value, "receipt");
  if (receipt.schemaVersion !== 2) {
    throw new Error("UI parity real-host receipt schemaVersion must be 2.");
  }
  if (
    receipt.kind !== "dreamboard-ui-real-host-parity" ||
    receipt.mode !== "real-host-parity" ||
    receipt.result !== "passed" ||
    receipt.realHostExecutor !== true
  ) {
    throw new Error(
      "UI parity real-host receipt must be a passing real-host proof.",
    );
  }
  parseArtifactReference(receipt.input, "receipt.input");
  assertString(receipt.sdkTarballSha256, "receipt.sdkTarballSha256");
  assertString(receipt.fixtureBundleSha256, "receipt.fixtureBundleSha256");
  assertString(receipt.project, "receipt.project");
  const scenarios = assertArray(receipt.scenarios, "receipt.scenarios");
  if (scenarios.length === 0) {
    throw new Error("receipt.scenarios must not be empty.");
  }
  for (let index = 0; index < scenarios.length; index += 1) {
    const scenario = assertRecord(
      scenarios[index],
      `receipt.scenarios[${index}]`,
    );
    assertString(scenario.id, `receipt.scenarios[${index}].id`);
    assertString(
      scenario.fixtureDigest,
      `receipt.scenarios[${index}].fixtureDigest`,
    );
  }
  parseReceiptComparisonGroup(receipt.source, "receipt.source", false);
  parseReceiptComparisonGroup(receipt.internal, "receipt.internal", true);
  const host = assertRecord(receipt.host, "receipt.host");
  assertString(host.route, "receipt.host.route");
  assertString(host.webLogPath, "receipt.host.webLogPath");
  assertPortablePath(host.webLogPath as string, "receipt.host.webLogPath");
  if (
    host.pluginIframe !== true ||
    host.pluginSessionGateway !== true ||
    host.playwright !== "chromium"
  ) {
    throw new Error(
      "receipt.host must prove PluginIframe, PluginSessionGateway, and Chromium.",
    );
  }
  return receipt as unknown as UIParityRealHostReceipt;
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

function parseGameplayBasis(value: unknown, path: string): GameplayBasis {
  const basis = assertRecord(value, path);
  assertNonNegativeInteger(basis.generation, `${path}.generation`);
  assertNonNegativeInteger(basis.version, `${path}.version`);
  assertString(basis.actionSetVersion, `${path}.actionSetVersion`);
  assertString(basis.perspectivePlayerId, `${path}.perspectivePlayerId`);
  return basis as unknown as GameplayBasis;
}

function parseArtifactReference(
  value: unknown,
  path: string,
): UIParityArtifactReference {
  const reference = assertRecord(value, path);
  assertString(reference.path, `${path}.path`);
  assertPortablePath(reference.path as string, `${path}.path`);
  assertString(reference.sha256, `${path}.sha256`);
  if (!(reference.sha256 as string).startsWith("sha256:")) {
    throw new Error(`${path}.sha256 must be a sha256 digest.`);
  }
  return reference as unknown as UIParityArtifactReference;
}

function parseReceiptComparisonGroup(
  value: unknown,
  path: string,
  internal: boolean,
): void {
  const group = assertRecord(value, path);
  if (group.result !== "passed") {
    throw new Error(`${path}.result must be passed.`);
  }
  const comparisons = assertArray(group.comparisons, `${path}.comparisons`);
  for (let index = 0; index < comparisons.length; index += 1) {
    const itemPath = `${path}.comparisons[${index}]`;
    const comparison = assertRecord(comparisons[index], itemPath);
    assertString(comparison.scenarioId, `${itemPath}.scenarioId`);
    assertString(comparison.actual, `${itemPath}.actual`);
    assertPortablePath(comparison.actual as string, `${itemPath}.actual`);
    if (internal) {
      assertString(
        comparison.expectationComparison,
        `${itemPath}.expectationComparison`,
      );
      assertString(comparison.sourceComparison, `${itemPath}.sourceComparison`);
      assertPortablePath(
        comparison.expectationComparison as string,
        `${itemPath}.expectationComparison`,
      );
      assertPortablePath(
        comparison.sourceComparison as string,
        `${itemPath}.sourceComparison`,
      );
    } else {
      assertString(comparison.comparison, `${itemPath}.comparison`);
      assertOptionalString(comparison.evidence, `${itemPath}.evidence`);
      assertPortablePath(
        comparison.comparison as string,
        `${itemPath}.comparison`,
      );
      if (typeof comparison.evidence === "string") {
        assertPortablePath(comparison.evidence, `${itemPath}.evidence`);
      }
    }
  }
}

function assertPortablePath(value: string, path: string): void {
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    value.split(/[\\/]+/).includes("..")
  ) {
    throw new Error(
      `${path} must be a relative path within its portable bundle.`,
    );
  }
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

function assertNonNegativeInteger(value: unknown, path: string): void {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${path} must be a non-negative integer.`);
  }
}
