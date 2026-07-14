import type {
  BROWSER_INTERACTION_ACTUATOR_KINDS,
  BROWSER_INTERACTION_CANDIDATE_STATES,
  BROWSER_INTERACTION_READINESS_VALUES,
  BROWSER_INTERACTION_RECORD_ROLES,
  GAMEPLAY_BROWSER_INTERACTION_EFFECT_KINDS,
  GAMEPLAY_BROWSER_INTERACTION_INTENTS,
  GAMEPLAY_BROWSER_INTERACTION_SURFACE,
} from "./constants.js";
import type { CanonicalBrowserInteractionValue } from "./canonical.js";

export type BrowserInteractionSurface = string;
export type BrowserInteractionIntent = string;
export type BrowserInteractionRole =
  (typeof BROWSER_INTERACTION_RECORD_ROLES)[number];
export type GameplayBrowserInteractionSurface =
  typeof GAMEPLAY_BROWSER_INTERACTION_SURFACE;
export type GameplayBrowserInteractionIntent =
  (typeof GAMEPLAY_BROWSER_INTERACTION_INTENTS)[number];
export type GameplayBrowserInteractionEffectKind =
  (typeof GAMEPLAY_BROWSER_INTERACTION_EFFECT_KINDS)[number];
export type BrowserInteractionReadiness =
  (typeof BROWSER_INTERACTION_READINESS_VALUES)[number];
export type BrowserInteractionCandidateState =
  (typeof BROWSER_INTERACTION_CANDIDATE_STATES)[number];
export type BrowserInteractionActuatorKind =
  (typeof BROWSER_INTERACTION_ACTUATOR_KINDS)[number];

export interface BrowserInteractionProtocolIdentity {
  readonly name: "dreamboard-browser-interaction";
  readonly version: "3.0.0";
}

export type BrowserInteractionSurfaceEffect = {
  readonly kind: string;
  readonly [key: string]: CanonicalBrowserInteractionValue;
};

export interface BrowserInteractionScalarPattern {
  readonly field: string;
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
}

export type BrowserInteractionEffectPattern<
  Effect extends BrowserInteractionSurfaceEffect =
    BrowserInteractionSurfaceEffect,
> =
  | {
      readonly kind: "exact";
      readonly effect: Effect;
    }
  | {
      readonly kind: "match";
      readonly effectKind: Effect["kind"] & string;
      readonly fields?: Readonly<
        Record<string, CanonicalBrowserInteractionValue>
      >;
      readonly scalar?: BrowserInteractionScalarPattern;
    };

export type GameplaySemanticEffect =
  | {
      readonly kind: "setCandidate";
      readonly inputKey: string;
      readonly candidateValue: CanonicalBrowserInteractionValue;
      readonly beforeSelected: boolean;
      readonly afterSelected: boolean;
    }
  | {
      readonly kind: "adjustResource";
      readonly inputKey: string;
      readonly resourceKey: CanonicalBrowserInteractionValue;
      readonly delta: -1 | 1;
    }
  | {
      readonly kind: "setScalar";
      readonly inputKey: string;
      readonly value: number;
    }
  | {
      readonly kind: "commit";
    }
  | {
      readonly kind: "invoke";
    };

export type GameplaySemanticEffectPattern =
  BrowserInteractionEffectPattern<GameplaySemanticEffect>;

export interface BrowserInteractionDiagnostic {
  readonly code:
    | "ambiguous-actuator"
    | "ambiguous-effect-match"
    | "ambiguous-pointer-target"
    | "ambiguous-preparation-pattern"
    | "disabled-effect-actuator"
    | "disabled-pointer-target"
    | "duplicate-accepted-effect-pattern-match"
    | "duplicate-enabled-actuator"
    | "duplicate-enabled-effect-actuator"
    | "duplicate-enabled-pointer-target"
    | "effect-actuator-kind-incompatibility"
    | "effect-intent-incompatibility"
    | "invalid-candidate"
    | "invalid-effect-payload"
    | "invalid-effect-pattern"
    | "invalid-protocol"
    | "invalid-record"
    | "invalid-scalar-argument"
    | "missing-effect"
    | "orphan-actuator"
    | "orphan-pointer-target"
    | "preparation-cycle"
    | "surface-intent-collision"
    | "unknown-surface-effect"
    | "unknown-intent"
    | "unknown-surface"
    | "unavailable-actuator";
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly surface?: BrowserInteractionSurface;
  readonly scopeId?: string;
  readonly interactionKey?: string;
  readonly intent?: BrowserInteractionIntent;
  readonly actuatorId?: string;
  readonly targetId?: string;
}

export interface BrowserInteractionRawRecord {
  readonly attributes: Readonly<
    Record<string, string | boolean | null | undefined>
  >;
}

export interface BrowserInteractionPreparationTarget {
  readonly intent: BrowserInteractionIntent;
  readonly inputKey?: string;
  readonly candidateValue?: CanonicalBrowserInteractionValue;
  readonly candidateValueKey?: string;
  readonly actuatorKind?: BrowserInteractionActuatorKind;
}

export interface BrowserInteractionActuator {
  readonly actuatorId: string;
  readonly intent: BrowserInteractionIntent;
  readonly descriptorDigest?: string;
  readonly draftDigest?: string;
  readonly inputKey?: string;
  readonly candidateValue?: CanonicalBrowserInteractionValue;
  readonly candidateValueKey?: string;
  readonly candidateState?: BrowserInteractionCandidateState;
  readonly enabled: boolean;
  readonly actuatorKind: BrowserInteractionActuatorKind;
  readonly semanticEffects: readonly BrowserInteractionSurfaceEffect[];
  readonly acceptedEffectPatterns: readonly BrowserInteractionEffectPattern[];
  readonly preparationPatterns: readonly BrowserInteractionEffectPattern[];
  readonly prepares?: BrowserInteractionPreparationTarget;
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export interface BrowserInteractionPointerTarget {
  readonly targetId: string;
  readonly enabled: boolean;
  readonly acceptedEffectPatterns: readonly BrowserInteractionEffectPattern[];
  readonly descriptorDigest?: string;
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export interface BrowserInteractionEntity {
  readonly interactionKey: string;
  readonly interactionId: string;
  readonly descriptorDigest?: string;
  readonly draftDigest?: string;
  readonly readiness: BrowserInteractionReadiness;
  readonly actuators: readonly BrowserInteractionActuator[];
  readonly pointerTargets: readonly BrowserInteractionPointerTarget[];
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export type BrowserGameplayInteraction = BrowserInteractionEntity;

export interface BrowserInteractionSemanticSurfaceSnapshot<
  Surface extends BrowserInteractionSurface = BrowserInteractionSurface,
> {
  readonly surface: Surface;
  readonly scopeId: string;
  readonly interactions: readonly BrowserInteractionEntity[];
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export type BrowserSemanticSurfaceSnapshot<
  Surface extends BrowserInteractionSurface = BrowserInteractionSurface,
> = BrowserInteractionSemanticSurfaceSnapshot<Surface>;

export interface BrowserGameplaySurfaceSnapshot {
  readonly surface: GameplayBrowserInteractionSurface;
  readonly scopeId: string;
  readonly interactions: readonly BrowserGameplayInteraction[];
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export interface BrowserInteractionUnknownSurfaceSnapshot {
  readonly surface: BrowserInteractionSurface;
  readonly scopeId: string;
  readonly interactions?: never;
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export type BrowserInteractionSurfaceSnapshot =
  | BrowserGameplaySurfaceSnapshot
  | BrowserInteractionSemanticSurfaceSnapshot
  | BrowserInteractionUnknownSurfaceSnapshot;

export interface BrowserInteractionSnapshot {
  readonly protocol: BrowserInteractionProtocolIdentity;
  readonly surfaces: readonly BrowserInteractionSurfaceSnapshot[];
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export interface BrowserInteractionSurfaceDefinition<
  Surface extends BrowserInteractionSurface = BrowserInteractionSurface,
  Intent extends BrowserInteractionIntent = BrowserInteractionIntent,
  EffectKind extends string = string,
> {
  readonly surface: Surface;
  readonly intents: readonly Intent[];
  readonly effectKinds?: readonly EffectKind[];
}

export interface BrowserInteractionRegistry {
  readonly surfaces: ReadonlyMap<
    BrowserInteractionSurface,
    BrowserInteractionSurfaceDefinition
  >;
}

export interface BrowserInteractionIntentRequest {
  readonly surface: BrowserInteractionSurface;
  readonly scopeId?: string;
  readonly interactionKey?: string;
  readonly interactionId?: string;
  readonly intent: BrowserInteractionIntent;
  readonly inputKey?: string;
  readonly candidateValue?: unknown;
  readonly candidateValueKey?: string;
  readonly actuatorKind?: BrowserInteractionActuatorKind;
  readonly allowDisabled?: boolean;
}

export interface BrowserInteractionEffectRequest<
  Effect extends BrowserInteractionSurfaceEffect =
    BrowserInteractionSurfaceEffect,
> {
  readonly surface: BrowserInteractionSurface;
  readonly scopeId?: string;
  readonly interactionKey?: string;
  readonly interactionId?: string;
  readonly effect: Effect;
  readonly allowDisabled?: boolean;
}

export type GameplayBrowserInteractionEffectRequest =
  BrowserInteractionEffectRequest<GameplaySemanticEffect>;

export interface BrowserInteractionResolutionSuccess {
  readonly ok: true;
  readonly actuator: BrowserInteractionActuator;
  readonly surface: BrowserInteractionSurface;
  readonly scopeId: string;
  readonly interactionKey: string;
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export interface BrowserInteractionResolutionFailure {
  readonly ok: false;
  readonly code:
    | "ambiguous"
    | "invalid-snapshot"
    | "not-found"
    | "preparation-required"
    | "unavailable";
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
  readonly preparation?: readonly BrowserInteractionActuator[];
}

export type BrowserInteractionResolution =
  | BrowserInteractionResolutionSuccess
  | BrowserInteractionResolutionFailure;

export interface BrowserInteractionEffectResolutionSuccess {
  readonly ok: true;
  readonly actuator: BrowserInteractionActuator;
  readonly surface: BrowserInteractionSurface;
  readonly scopeId: string;
  readonly interactionKey: string;
  readonly match: "exact" | "accepted-pattern";
  readonly effect: BrowserInteractionSurfaceEffect;
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export interface BrowserInteractionPointerTargetResolutionSuccess {
  readonly ok: true;
  readonly pointerTarget: BrowserInteractionPointerTarget;
  readonly surface: BrowserInteractionSurface;
  readonly scopeId: string;
  readonly interactionKey: string;
  readonly match: "accepted-pattern";
  readonly effect: BrowserInteractionSurfaceEffect;
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export interface BrowserInteractionPointerTargetResolutionFailure {
  readonly ok: false;
  readonly code:
    | "ambiguous"
    | "invalid-effect"
    | "invalid-snapshot"
    | "not-found"
    | "unavailable";
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export type BrowserInteractionPointerTargetResolution =
  | BrowserInteractionPointerTargetResolutionSuccess
  | BrowserInteractionPointerTargetResolutionFailure;

export interface BrowserInteractionEffectResolutionFailure {
  readonly ok: false;
  readonly code:
    | "ambiguous"
    | "invalid-effect"
    | "invalid-snapshot"
    | "not-found"
    | "preparation-required"
    | "unavailable";
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
  readonly preparation?: readonly BrowserInteractionActuator[];
}

export type BrowserInteractionEffectResolution =
  | BrowserInteractionEffectResolutionSuccess
  | BrowserInteractionEffectResolutionFailure;
