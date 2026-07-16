import {
  isSemanticSurfaceSnapshot,
  resolveBrowserInteractionEffect,
  resolveBrowserInteractionIntent,
  resolveBrowserPointerTarget,
  validateBrowserInteractionSnapshot,
  type BrowserInteractionActuator,
  type BrowserInteractionDiagnostic,
  type BrowserInteractionEffectRequest,
  type BrowserInteractionEffectResolution,
  type BrowserInteractionEffectResolutionSuccess,
  type BrowserInteractionPointerTarget,
  type BrowserInteractionPointerTargetResolution,
  type BrowserInteractionResolution,
  type BrowserInteractionResolutionSuccess,
  type BrowserInteractionSnapshot,
} from "@dreamboard-games/sdk/browser-interaction";
import { digestPluginRuntimeJson } from "@dreamboard-games/sdk/plugin-runtime-contract";
import type {
  UIReplayExecution,
  UIReplayRequest,
  UIResolvedReplayIdentity,
  UIScenarioReplayStep,
  UIStepExpectation,
} from "@dreamboard-games/sdk/testing";

type SuccessfulResolution =
  | BrowserInteractionResolutionSuccess
  | BrowserInteractionEffectResolutionSuccess;
type FailedResolution =
  | Exclude<BrowserInteractionResolution, { readonly ok: true }>
  | Exclude<BrowserInteractionEffectResolution, { readonly ok: true }>;
type FailedPointerTargetResolution = Exclude<
  BrowserInteractionPointerTargetResolution,
  { readonly ok: true }
>;

export type WorkbenchSemanticReplayStep = Extract<
  UIScenarioReplayStep,
  { readonly resolve: UIReplayRequest }
>;
export type WorkbenchScenarioReplayStep = UIScenarioReplayStep;

export interface ReplayActuatorReference {
  readonly kind: "actuator";
  readonly surface: string;
  readonly scopeId: string;
  readonly interactionKey: string;
  readonly interactionId: string;
  readonly actuator: BrowserInteractionActuator;
}

export interface ReplayPointerTargetReference {
  readonly kind: "pointer-target";
  readonly surface: string;
  readonly scopeId: string;
  readonly interactionKey: string;
  readonly interactionId: string;
  readonly pointerTarget: BrowserInteractionPointerTarget;
}

export type ReplayDragTargetReference =
  | ReplayActuatorReference
  | ReplayPointerTargetReference;

export interface ReplayExecutionInstruction {
  readonly stepId: string;
  readonly source: ReplayActuatorReference;
  readonly execute: UIReplayExecution;
  readonly target?: ReplayDragTargetReference;
}

export interface ReplayStepDiagnostics {
  readonly stepId: string;
  readonly request: UIReplayRequest;
  readonly requestDigest?: string;
  readonly actuatorId?: string;
  readonly actuatorType?: string;
  readonly expectedSemanticDigest?: string;
  readonly measuredSemanticDigest?: string;
  readonly draftDigest?: string;
  readonly validationState?: string;
  readonly submissionState?: string;
  readonly firstFailure?: string;
}

export interface ReplayStepMeasurement {
  readonly scenarioId?: string;
  readonly frameId?: string;
  readonly projectionDigest?: string;
  readonly focusedInteractionKey?: string;
  readonly validationState?: string;
  readonly submissionState?: string;
}

export interface WorkbenchReplayStepEvidence {
  readonly stepId: string;
  readonly interactionId: string;
  readonly frameId?: string;
  readonly projectionDigest?: string;
  readonly semanticDigest?: string;
  readonly draftDigest?: string;
  readonly submissionDigest?: string;
  readonly visibleInteractionKeys: readonly string[];
  readonly diagnostics: ReplayStepDiagnostics;
}

export class SemanticResolutionError extends Error {
  readonly stepId: string;
  readonly result: FailedResolution | FailedPointerTargetResolution;

  constructor(
    stepId: string,
    result: FailedResolution | FailedPointerTargetResolution,
  ) {
    super(
      `Replay step '${stepId}' semantic resolution failed with ${result.code}: ${formatDiagnostics(
        result.diagnostics,
      )}`,
    );
    this.name = "SemanticResolutionError";
    this.stepId = stepId;
    this.result = result;
  }
}

export interface ReplayPreparationPlan {
  readonly kind: "preparation";
  readonly stepId: string;
  readonly request: UIReplayRequest;
  readonly preparation: readonly BrowserInteractionActuator[];
  readonly diagnostics: ReplayStepDiagnostics;
}

export interface ReplayExecutionPlan {
  readonly kind: "execution";
  readonly instruction: ReplayExecutionInstruction;
  readonly diagnostics: ReplayStepDiagnostics;
}

export type ReplayPlan = ReplayPreparationPlan | ReplayExecutionPlan;

export function planReplayStep(
  snapshot: BrowserInteractionSnapshot,
  step: WorkbenchSemanticReplayStep,
): ReplayPlan {
  const resolution = resolveBrowserInteractionRequest(snapshot, step.resolve);

  if (!resolution.ok && resolution.code === "preparation-required") {
    return {
      kind: "preparation",
      stepId: step.stepId,
      request: step.resolve,
      preparation: resolution.preparation ?? [],
      diagnostics: createStepDiagnostics(step, {
        firstFailure: firstDiagnosticMessage(resolution.diagnostics),
      }),
    };
  }

  if (!resolution.ok) {
    throw new SemanticResolutionError(step.stepId, resolution);
  }

  const source = resolutionToActuatorReference(snapshot, resolution);
  assertExpectedIdentity(step, source);

  const instruction: ReplayExecutionInstruction = {
    stepId: step.stepId,
    source,
    execute: step.execute,
  };
  if (step.execute.kind === "drag") {
    return {
      kind: "execution",
      instruction: {
        ...instruction,
        target: resolveReplayTarget(
          snapshot,
          step as WorkbenchSemanticReplayStep & {
            readonly execute: Extract<
              UIReplayExecution,
              { readonly kind: "drag" }
            >;
          },
        ),
      },
      diagnostics: createStepDiagnostics(step, {
        actuatorId: source.actuator.actuatorId,
        actuatorType: source.actuator.actuatorKind,
        draftDigest: source.actuator.draftDigest,
      }),
    };
  }

  return {
    kind: "execution",
    instruction,
    diagnostics: createStepDiagnostics(step, {
      actuatorId: source.actuator.actuatorId,
      actuatorType: source.actuator.actuatorKind,
      draftDigest: source.actuator.draftDigest,
    }),
  };
}

export function createPreparationInstruction(
  snapshot: BrowserInteractionSnapshot,
  stepId: string,
  actuator: BrowserInteractionActuator,
): ReplayExecutionInstruction {
  return {
    stepId,
    source: findActuatorReference(snapshot, actuator),
    execute: { kind: "activate" },
  };
}

export function assertStepExpectation(
  step: WorkbenchSemanticReplayStep,
  source: ReplayActuatorReference,
  snapshot: BrowserInteractionSnapshot,
  measurement: ReplayStepMeasurement,
  diagnostics: ReplayStepDiagnostics,
): WorkbenchReplayStepEvidence {
  const visibleInteractionKeys = snapshot.surfaces.flatMap((surface) =>
    isSemanticSurfaceSnapshot(surface)
      ? surface.interactions.map((interaction) => interaction.interactionKey)
      : [],
  );
  const actualValues = {
    ...measurement,
    draftDigest: readCurrentDraftDigest(snapshot),
    semanticDigest: measurement.scenarioId
      ? digestWorkbenchReplayJson({
          digestVersion: "runtime-browser-interaction@2",
          snapshot,
        })
      : undefined,
    submissionDigest: measurement.scenarioId
      ? digestWorkbenchReplayJson({
          fixtureId: measurement.scenarioId,
          interactionId: source.interactionId,
        })
      : undefined,
    visibleInteractionKeys,
  };
  const nextDiagnostics = {
    ...diagnostics,
    measuredSemanticDigest: actualValues.semanticDigest,
    draftDigest: actualValues.draftDigest ?? diagnostics.draftDigest,
    validationState: measurement.validationState ?? diagnostics.validationState,
    submissionState: measurement.submissionState ?? diagnostics.submissionState,
  };

  assertExpectedValues(step, actualValues);

  return {
    stepId: step.stepId,
    interactionId: source.interactionId,
    frameId: actualValues.frameId,
    projectionDigest: actualValues.projectionDigest,
    semanticDigest: actualValues.semanticDigest,
    draftDigest: actualValues.draftDigest,
    submissionDigest: actualValues.submissionDigest,
    visibleInteractionKeys,
    diagnostics: nextDiagnostics,
  };
}

export function assertSnapshotExpectation(
  step: WorkbenchScenarioReplayStep,
  snapshot: BrowserInteractionSnapshot,
  measurement: ReplayStepMeasurement,
  diagnostics: ReplayStepDiagnostics,
): WorkbenchReplayStepEvidence {
  const visibleInteractionKeys = snapshot.surfaces.flatMap((surface) =>
    isSemanticSurfaceSnapshot(surface)
      ? surface.interactions.map((interaction) => interaction.interactionKey)
      : [],
  );
  const actualValues = {
    ...measurement,
    draftDigest: readCurrentDraftDigest(snapshot),
    submissionDigest: undefined,
    semanticDigest: measurement.scenarioId
      ? digestWorkbenchReplayJson({
          digestVersion: "runtime-browser-interaction@2",
          snapshot,
        })
      : undefined,
    visibleInteractionKeys,
  };
  const nextDiagnostics = {
    ...diagnostics,
    measuredSemanticDigest: actualValues.semanticDigest,
    draftDigest: actualValues.draftDigest ?? diagnostics.draftDigest,
    validationState: measurement.validationState ?? diagnostics.validationState,
    submissionState: measurement.submissionState ?? diagnostics.submissionState,
  };

  assertExpectedValues(step, actualValues);

  return {
    stepId: step.stepId,
    interactionId: "assert",
    frameId: actualValues.frameId,
    projectionDigest: actualValues.projectionDigest,
    semanticDigest: actualValues.semanticDigest,
    draftDigest: actualValues.draftDigest,
    submissionDigest: actualValues.submissionDigest,
    visibleInteractionKeys,
    diagnostics: nextDiagnostics,
  };
}

export function assertValidSemanticSnapshot(
  snapshot: BrowserInteractionSnapshot,
): void {
  const diagnostics = [
    ...snapshot.diagnostics,
    ...validateBrowserInteractionSnapshot(snapshot),
  ].filter((diagnostic) => diagnostic.severity === "error");
  if (diagnostics.length > 0) {
    throw new Error(
      `Invalid semantic snapshot: ${formatDiagnostics(diagnostics)}`,
    );
  }
}

export function createStepDiagnostics(
  step: WorkbenchScenarioReplayStep,
  values: Partial<ReplayStepDiagnostics> = {},
): ReplayStepDiagnostics {
  return {
    stepId: step.stepId,
    request: "resolve" in step ? step.resolve : ({} as UIReplayRequest),
    requestDigest: "requestDigest" in step ? step.requestDigest : undefined,
    expectedSemanticDigest: step.expect.semanticDigest,
    ...values,
  };
}

function assertExpectedValues(
  step: WorkbenchScenarioReplayStep,
  actualValues: Partial<
    ReplayStepMeasurement & {
      readonly semanticDigest: string;
      readonly draftDigest: string;
      readonly submissionDigest: string;
      readonly visibleInteractionKeys: readonly string[];
    }
  >,
): void {
  for (const key of [
    "frameId",
    "projectionDigest",
    "semanticDigest",
    "draftDigest",
    "submissionDigest",
    "focusedInteractionKey",
  ] as const) {
    if (
      step.expect[key] !== undefined &&
      actualValues[key] !== step.expect[key]
    ) {
      throw new Error(
        `Replay step '${step.stepId}' expected ${key} '${step.expect[key]}', received '${actualValues[key] ?? "<unavailable>"}'.`,
      );
    }
  }
  if (step.expect.visibleInteractionKeys) {
    const visible = new Set(actualValues.visibleInteractionKeys ?? []);
    const missing = step.expect.visibleInteractionKeys.filter(
      (key) => !visible.has(key),
    );
    if (missing.length > 0) {
      throw new Error(
        `Replay step '${step.stepId}' missing visible interactions: ${missing.join(", ")}.`,
      );
    }
  }
}

function resolveReplayTarget(
  snapshot: BrowserInteractionSnapshot,
  step: WorkbenchSemanticReplayStep & {
    readonly execute: Extract<UIReplayExecution, { readonly kind: "drag" }>;
  },
): ReplayDragTargetReference {
  const pointerTargetResolution = resolveBrowserPointerTarget(
    snapshot,
    step.execute.target,
  );
  if (pointerTargetResolution.ok) {
    return pointerTargetResolutionToReference(
      snapshot,
      pointerTargetResolution,
    );
  }
  if (pointerTargetResolution.code !== "not-found") {
    throw new SemanticResolutionError(step.stepId, pointerTargetResolution);
  }

  const resolution = resolveBrowserInteractionEffect(
    snapshot,
    step.execute.target,
  );
  if (!resolution.ok) {
    throw new SemanticResolutionError(step.stepId, resolution);
  }
  return resolutionToActuatorReference(snapshot, resolution);
}

function resolveBrowserInteractionRequest(
  snapshot: BrowserInteractionSnapshot,
  request: UIReplayRequest,
): BrowserInteractionResolution | BrowserInteractionEffectResolution {
  if (isEffectRequest(request)) {
    return resolveBrowserInteractionEffect(snapshot, request);
  }
  return resolveBrowserInteractionIntent(snapshot, request);
}

function isEffectRequest(
  request: UIReplayRequest,
): request is BrowserInteractionEffectRequest {
  return "effect" in request;
}

function resolutionToActuatorReference(
  snapshot: BrowserInteractionSnapshot,
  resolution: SuccessfulResolution,
): ReplayActuatorReference {
  return findActuatorReference(snapshot, resolution.actuator, {
    surface: resolution.surface,
    scopeId: resolution.scopeId,
    interactionKey: resolution.interactionKey,
  });
}

function findActuatorReference(
  snapshot: BrowserInteractionSnapshot,
  actuator: BrowserInteractionActuator,
  scope?: {
    readonly surface: string;
    readonly scopeId: string;
    readonly interactionKey: string;
  },
): ReplayActuatorReference {
  const matches: ReplayActuatorReference[] = [];
  for (const surface of snapshot.surfaces) {
    if (!isSemanticSurfaceSnapshot(surface)) continue;
    if (scope && surface.surface !== scope.surface) continue;
    if (scope && surface.scopeId !== scope.scopeId) continue;
    for (const interaction of surface.interactions) {
      if (scope && interaction.interactionKey !== scope.interactionKey) {
        continue;
      }
      const found = interaction.actuators.find(
        (candidate) =>
          candidate.actuatorId === actuator.actuatorId &&
          candidate.intent === actuator.intent &&
          candidate.actuatorKind === actuator.actuatorKind &&
          candidate.inputKey === actuator.inputKey &&
          candidate.candidateValueKey === actuator.candidateValueKey,
      );
      if (!found) continue;
      matches.push({
        kind: "actuator",
        surface: surface.surface,
        scopeId: surface.scopeId,
        interactionKey: interaction.interactionKey,
        interactionId: interaction.interactionId,
        actuator: found,
      });
    }
  }
  if (matches.length !== 1) {
    throw new Error(
      `Resolved actuator '${actuator.actuatorId}' mapped to ${matches.length} DOM semantic records; expected exactly one.`,
    );
  }
  return matches[0]!;
}

function pointerTargetResolutionToReference(
  snapshot: BrowserInteractionSnapshot,
  resolution: Extract<BrowserInteractionPointerTargetResolution, { ok: true }>,
): ReplayPointerTargetReference {
  const matches: ReplayPointerTargetReference[] = [];
  for (const surface of snapshot.surfaces) {
    if (!isSemanticSurfaceSnapshot(surface)) continue;
    if (surface.surface !== resolution.surface) continue;
    if (surface.scopeId !== resolution.scopeId) continue;
    for (const interaction of surface.interactions) {
      if (interaction.interactionKey !== resolution.interactionKey) continue;
      const found = interaction.pointerTargets.find(
        (candidate) => candidate.targetId === resolution.pointerTarget.targetId,
      );
      if (!found) continue;
      matches.push({
        kind: "pointer-target",
        surface: surface.surface,
        scopeId: surface.scopeId,
        interactionKey: interaction.interactionKey,
        interactionId: interaction.interactionId,
        pointerTarget: found,
      });
    }
  }
  if (matches.length !== 1) {
    throw new Error(
      `Resolved pointer target '${resolution.pointerTarget.targetId}' mapped to ${matches.length} DOM semantic records; expected exactly one.`,
    );
  }
  return matches[0]!;
}

function assertExpectedIdentity(
  step: WorkbenchSemanticReplayStep,
  reference: ReplayActuatorReference,
): void {
  const expected: UIResolvedReplayIdentity | undefined = step.expectedIdentity;
  if (!expected) return;
  const actual = {
    stepId: step.stepId,
    surface: reference.surface,
    scopeId: reference.scopeId,
    interactionKey: reference.interactionKey,
    interactionId: reference.interactionId,
    actuatorId: reference.actuator.actuatorId,
    descriptorDigest: reference.actuator.descriptorDigest,
    draftDigest: reference.actuator.draftDigest,
  };
  for (const key of [
    "surface",
    "scopeId",
    "interactionKey",
    "interactionId",
    "actuatorId",
    "descriptorDigest",
    "draftDigest",
  ] as const) {
    if (expected[key] !== undefined && expected[key] !== actual[key]) {
      throw new Error(
        `Replay step '${step.stepId}' resolved ${key} '${String(
          actual[key],
        )}', expected '${expected[key]}'.`,
      );
    }
  }
}

function readCurrentDraftDigest(
  snapshot: BrowserInteractionSnapshot,
): string | undefined {
  const digests = new Set<string>();
  for (const surface of snapshot.surfaces) {
    if (!isSemanticSurfaceSnapshot(surface)) continue;
    for (const interaction of surface.interactions) {
      if (interaction.draftDigest) digests.add(interaction.draftDigest);
      for (const actuator of interaction.actuators) {
        if (actuator.draftDigest) digests.add(actuator.draftDigest);
      }
    }
  }
  return digests.size === 1 ? [...digests][0] : undefined;
}

function digestWorkbenchReplayJson(value: unknown): string {
  return digestPluginRuntimeJson(value);
}

function firstDiagnosticMessage(
  diagnostics: readonly BrowserInteractionDiagnostic[],
): string | undefined {
  return diagnostics[0]
    ? `${diagnostics[0].code} ${diagnostics[0].message}`
    : undefined;
}

export function formatDiagnostics(
  diagnostics: readonly BrowserInteractionDiagnostic[],
): string {
  if (diagnostics.length === 0) return "no diagnostics";
  return diagnostics
    .map((diagnostic) => `${diagnostic.code} ${diagnostic.message}`)
    .join("; ");
}

export type { UIStepExpectation };
