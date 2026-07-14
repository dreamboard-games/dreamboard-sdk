import {
  createGameplayActuatorAttributes,
  createGameplayInteractionRootAttributes,
  type BrowserInteractionAttributeMap,
  type BrowserInteractionCandidateState,
  type GameplayActuatorAttributesInput,
  type GameplayBrowserInteractionIntent,
} from "../../browser-interaction/index.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";

export const GAMEPLAY_BROWSER_SCOPE_ID = "runtime";

export function gameplayInteractionRootAttributes({
  descriptor,
  draftDigest,
  ready,
  available,
}: {
  descriptor: InteractionDescriptor;
  draftDigest: string | undefined;
  ready: boolean;
  available: boolean;
}): BrowserInteractionAttributeMap {
  return createGameplayInteractionRootAttributes({
    scopeId: GAMEPLAY_BROWSER_SCOPE_ID,
    interactionKey: descriptor.interactionKey,
    interactionId: descriptor.interactionId,
    ...(descriptor.descriptorDigest !== undefined
      ? { descriptorDigest: descriptor.descriptorDigest }
      : {}),
    ...(draftDigest !== undefined ? { draftDigest } : {}),
    readiness: available ? (ready ? "ready" : "blocked") : "unavailable",
  });
}

export function gameplayActuatorAttributes({
  descriptor,
  draftDigest,
  inputKey,
  intent,
  candidateValue,
  candidateState,
  semanticEffects,
  acceptedEffectPatterns,
  preparationPatterns,
  enabled,
  actuatorKind,
  actuatorId,
}: {
  descriptor: InteractionDescriptor;
  draftDigest: string | undefined;
  inputKey?: string;
  intent: GameplayBrowserInteractionIntent;
  candidateValue?: unknown;
  candidateState?: BrowserInteractionCandidateState;
  semanticEffects?: GameplayActuatorAttributesInput["semanticEffects"];
  acceptedEffectPatterns?: GameplayActuatorAttributesInput["acceptedEffectPatterns"];
  preparationPatterns?: GameplayActuatorAttributesInput["preparationPatterns"];
  enabled: boolean;
  actuatorKind: GameplayActuatorAttributesInput["actuatorKind"];
  actuatorId: string;
}): BrowserInteractionAttributeMap {
  return createGameplayActuatorAttributes({
    scopeId: GAMEPLAY_BROWSER_SCOPE_ID,
    interactionKey: descriptor.interactionKey,
    interactionId: descriptor.interactionId,
    intent,
    enabled,
    actuatorKind,
    actuatorId,
    ...(descriptor.descriptorDigest !== undefined
      ? { descriptorDigest: descriptor.descriptorDigest }
      : {}),
    ...(draftDigest !== undefined ? { draftDigest } : {}),
    ...(inputKey !== undefined ? { inputKey } : {}),
    ...(candidateValue !== undefined ? { candidateValue } : {}),
    ...(candidateState !== undefined ? { candidateState } : {}),
    ...(semanticEffects !== undefined ? { semanticEffects } : {}),
    ...(acceptedEffectPatterns !== undefined ? { acceptedEffectPatterns } : {}),
    ...(preparationPatterns !== undefined ? { preparationPatterns } : {}),
  });
}
