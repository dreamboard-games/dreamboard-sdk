import type {
  BROWSER_INTERACTION_ACTUATOR_KINDS,
  BROWSER_INTERACTION_CANDIDATE_STATES,
  BROWSER_INTERACTION_READINESS_VALUES,
  BROWSER_INTERACTION_RECORD_ROLES,
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
export type BrowserInteractionReadiness =
  (typeof BROWSER_INTERACTION_READINESS_VALUES)[number];
export type BrowserInteractionCandidateState =
  (typeof BROWSER_INTERACTION_CANDIDATE_STATES)[number];
export type BrowserInteractionActuatorKind =
  (typeof BROWSER_INTERACTION_ACTUATOR_KINDS)[number];

export interface BrowserInteractionProtocolIdentity {
  readonly name: "dreamboard-browser-interaction";
  readonly version: "1.0.0";
}

export interface BrowserInteractionDiagnostic {
  readonly code:
    | "ambiguous-actuator"
    | "duplicate-enabled-actuator"
    | "invalid-candidate"
    | "invalid-protocol"
    | "invalid-record"
    | "orphan-actuator"
    | "preparation-cycle"
    | "surface-intent-collision"
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
  readonly prepares?: BrowserInteractionPreparationTarget;
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export interface BrowserInteractionEntity {
  readonly interactionKey: string;
  readonly interactionId: string;
  readonly descriptorDigest?: string;
  readonly draftDigest?: string;
  readonly readiness: BrowserInteractionReadiness;
  readonly actuators: readonly BrowserInteractionActuator[];
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
> {
  readonly surface: Surface;
  readonly intents: readonly Intent[];
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
