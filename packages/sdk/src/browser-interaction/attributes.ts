import {
  BROWSER_INTERACTION_ATTRIBUTES,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
  GAMEPLAY_BROWSER_INTERACTION_SURFACE,
} from "./constants.js";
import { encodeCanonicalCandidateValue } from "./canonical.js";
import type {
  BrowserInteractionActuatorKind,
  BrowserInteractionCandidateState,
  BrowserInteractionIntent,
  BrowserInteractionPreparationTarget,
  BrowserInteractionReadiness,
  GameplayBrowserInteractionIntent,
} from "./types.js";

export type BrowserInteractionAttributeMap = Record<string, string | boolean>;

export interface BrowserInteractionRootAttributesInput {
  readonly surface: string;
  readonly scopeId: string;
  readonly interactionKey: string;
  readonly interactionId: string;
  readonly descriptorDigest?: string;
  readonly draftDigest?: string;
  readonly readiness: BrowserInteractionReadiness;
}

export interface BrowserInteractionActuatorAttributesInput {
  readonly surface: string;
  readonly scopeId: string;
  readonly interactionKey: string;
  readonly interactionId: string;
  readonly descriptorDigest?: string;
  readonly draftDigest?: string;
  readonly intent: BrowserInteractionIntent;
  readonly inputKey?: string;
  readonly candidateValue?: unknown;
  readonly candidateState?: BrowserInteractionCandidateState;
  readonly enabled?: boolean;
  readonly actuatorKind: BrowserInteractionActuatorKind;
  readonly actuatorId?: string;
  readonly prepares?: BrowserInteractionPreparationTarget;
}

function baseGameplayAttributes(
  input: Pick<
    BrowserInteractionRootAttributesInput,
    "surface" | "scopeId" | "interactionKey" | "interactionId"
  >,
): BrowserInteractionAttributeMap {
  return {
    [BROWSER_INTERACTION_ATTRIBUTES.protocol]:
      DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
    [BROWSER_INTERACTION_ATTRIBUTES.surface]: input.surface,
    [BROWSER_INTERACTION_ATTRIBUTES.scope]: input.scopeId,
    [BROWSER_INTERACTION_ATTRIBUTES.interactionKey]: input.interactionKey,
    [BROWSER_INTERACTION_ATTRIBUTES.interactionId]: input.interactionId,
  };
}

export function createBrowserInteractionRootAttributes(
  input: BrowserInteractionRootAttributesInput,
): BrowserInteractionAttributeMap {
  return {
    ...baseGameplayAttributes(input),
    [BROWSER_INTERACTION_ATTRIBUTES.role]: "interaction",
    [BROWSER_INTERACTION_ATTRIBUTES.descriptorDigest]:
      input.descriptorDigest ?? "",
    [BROWSER_INTERACTION_ATTRIBUTES.draftDigest]: input.draftDigest ?? "",
    [BROWSER_INTERACTION_ATTRIBUTES.readiness]: input.readiness,
  };
}

export function createBrowserInteractionActuatorAttributes(
  input: BrowserInteractionActuatorAttributesInput,
): BrowserInteractionAttributeMap {
  const attrs: BrowserInteractionAttributeMap = {
    ...baseGameplayAttributes(input),
    [BROWSER_INTERACTION_ATTRIBUTES.role]: "actuator",
    [BROWSER_INTERACTION_ATTRIBUTES.intent]: input.intent,
    [BROWSER_INTERACTION_ATTRIBUTES.actuatorKind]: input.actuatorKind,
    [BROWSER_INTERACTION_ATTRIBUTES.enabled]:
      input.enabled === false ? "false" : "true",
  };
  if (input.descriptorDigest) {
    attrs[BROWSER_INTERACTION_ATTRIBUTES.descriptorDigest] =
      input.descriptorDigest;
  }
  if (input.draftDigest) {
    attrs[BROWSER_INTERACTION_ATTRIBUTES.draftDigest] = input.draftDigest;
  }
  if (input.actuatorId) {
    attrs[BROWSER_INTERACTION_ATTRIBUTES.actuatorId] = input.actuatorId;
  }
  if (input.inputKey) {
    attrs[BROWSER_INTERACTION_ATTRIBUTES.inputKey] = input.inputKey;
  }
  if ("candidateValue" in input) {
    attrs[BROWSER_INTERACTION_ATTRIBUTES.candidateValue] =
      encodeCanonicalCandidateValue(input.candidateValue);
  }
  if (input.candidateState) {
    attrs[BROWSER_INTERACTION_ATTRIBUTES.candidateState] = input.candidateState;
  }
  if (input.prepares) {
    attrs[BROWSER_INTERACTION_ATTRIBUTES.preparesIntent] =
      input.prepares.intent;
    if (input.prepares.inputKey) {
      attrs[BROWSER_INTERACTION_ATTRIBUTES.preparesInputKey] =
        input.prepares.inputKey;
    }
    if (input.prepares.candidateValueKey) {
      attrs[BROWSER_INTERACTION_ATTRIBUTES.preparesCandidateValue] =
        input.prepares.candidateValueKey;
    } else if ("candidateValue" in input.prepares) {
      attrs[BROWSER_INTERACTION_ATTRIBUTES.preparesCandidateValue] =
        encodeCanonicalCandidateValue(input.prepares.candidateValue);
    }
    if (input.prepares.actuatorKind) {
      attrs[BROWSER_INTERACTION_ATTRIBUTES.preparesActuatorKind] =
        input.prepares.actuatorKind;
    }
  }
  return attrs;
}

export type GameplayInteractionRootAttributesInput = Omit<
  BrowserInteractionRootAttributesInput,
  "surface"
>;

export type GameplayActuatorAttributesInput = Omit<
  BrowserInteractionActuatorAttributesInput,
  "surface" | "intent"
> & {
  readonly intent: GameplayBrowserInteractionIntent;
};

export function createGameplayInteractionRootAttributes(
  input: GameplayInteractionRootAttributesInput,
): BrowserInteractionAttributeMap {
  return createBrowserInteractionRootAttributes({
    ...input,
    surface: GAMEPLAY_BROWSER_INTERACTION_SURFACE,
  });
}

export function createGameplayActuatorAttributes(
  input: GameplayActuatorAttributesInput,
): BrowserInteractionAttributeMap {
  return createBrowserInteractionActuatorAttributes({
    ...input,
    surface: GAMEPLAY_BROWSER_INTERACTION_SURFACE,
  });
}

export function createBrowserInteractionActuatorKey(input: {
  readonly surface: string;
  readonly scopeId: string;
  readonly interactionKey: string;
  readonly intent: BrowserInteractionIntent;
  readonly inputKey?: string;
  readonly candidateValueKey?: string;
  readonly actuatorKind: BrowserInteractionActuatorKind;
}): string {
  return [
    input.surface,
    input.scopeId,
    input.interactionKey,
    input.intent,
    input.inputKey ?? "",
    input.candidateValueKey ?? "",
    input.actuatorKind,
  ]
    .map((part) => encodeURIComponent(part))
    .join("|");
}
