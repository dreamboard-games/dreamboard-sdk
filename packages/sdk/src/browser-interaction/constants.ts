export const DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_NAME =
  "dreamboard-browser-interaction" as const;

export const DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION = "2.0.0" as const;

export const BROWSER_INTERACTION_ATTRIBUTES = {
  protocol: "data-dreamboard-browser-protocol",
  surface: "data-dreamboard-browser-surface",
  scope: "data-dreamboard-browser-scope",
  role: "data-dreamboard-browser-role",
  intent: "data-dreamboard-browser-intent",
  interactionKey: "data-dreamboard-interaction-key",
  interactionId: "data-dreamboard-interaction-id",
  descriptorDigest: "data-dreamboard-descriptor-digest",
  draftDigest: "data-dreamboard-draft-digest",
  readiness: "data-dreamboard-readiness",
  inputKey: "data-dreamboard-input-key",
  candidateValue: "data-dreamboard-candidate-value",
  candidateState: "data-dreamboard-candidate-state",
  actuatorKind: "data-dreamboard-actuator-kind",
  enabled: "data-dreamboard-actuator-enabled",
  actuatorId: "data-dreamboard-actuator-id",
  semanticEffects: "data-dreamboard-semantic-effects",
  acceptedEffectPatterns: "data-dreamboard-accepted-effect-patterns",
  preparationPatterns: "data-dreamboard-preparation-patterns",
  preparesIntent: "data-dreamboard-prepares-intent",
  preparesInputKey: "data-dreamboard-prepares-input-key",
  preparesCandidateValue: "data-dreamboard-prepares-candidate-value",
  preparesActuatorKind: "data-dreamboard-prepares-actuator-kind",
  diagnostic: "data-dreamboard-browser-diagnostic",
} as const;

export const BROWSER_INTERACTION_RECORD_ROLES = [
  "interaction",
  "actuator",
] as const;

export const GAMEPLAY_BROWSER_INTERACTION_SURFACE = "gameplay" as const;

export const GAMEPLAY_BROWSER_INTERACTION_INTENTS = [
  "arm",
  "reveal",
  "invoke",
  "select",
  "toggle",
  "increment",
  "decrement",
  "fill",
  "submit",
] as const;

export const GAMEPLAY_BROWSER_INTERACTION_EFFECT_KINDS = [
  "setCandidate",
  "adjustResource",
  "setScalar",
  "commit",
  "invoke",
] as const;

export const BROWSER_INTERACTION_READINESS_VALUES = [
  "ready",
  "blocked",
  "unavailable",
] as const;

export const BROWSER_INTERACTION_CANDIDATE_STATES = [
  "selected",
  "unselected",
  "mixed",
] as const;

export const BROWSER_INTERACTION_ACTUATOR_KINDS = [
  "click",
  "fill",
  "keyboard",
  "pointer",
] as const;
