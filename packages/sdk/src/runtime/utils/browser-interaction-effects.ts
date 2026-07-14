import {
  gameplayAdjustResourceEffect,
  gameplayCommitEffect,
  gameplayInvokeEffect,
  gameplaySetCandidateEffect,
  gameplaySetScalarEffect,
  type CanonicalBrowserInteractionValue,
  type GameplayBrowserInteractionIntent,
  type GameplaySemanticEffect,
  type GameplaySemanticEffectPattern,
} from "../../browser-interaction/index.js";
import type {
  InteractionDescriptor,
  InteractionInputDescriptor,
  InputDomain,
} from "../types/plugin-state.js";
import {
  inputByKey,
  isTargetDomain,
  resolveInputDomain,
} from "./interaction-inputs.js";

export function gameplayCandidateMetadata(input: {
  readonly descriptor: Pick<InteractionDescriptor, "inputs">;
  readonly draftValues: Readonly<Record<string, unknown>>;
  readonly inputKey: string;
  readonly candidateValue: unknown;
  readonly intent: Extract<
    GameplayBrowserInteractionIntent,
    "select" | "toggle"
  >;
}): {
  readonly semanticEffects: readonly GameplaySemanticEffect[];
} {
  const inputDescriptor = resolvedInputByKey(
    input.descriptor,
    input.inputKey,
    input.draftValues,
  );
  if (!inputDescriptor) return { semanticEffects: [] };
  const currentValue = input.draftValues[input.inputKey];
  const beforeSelected = isCandidateSelected(
    currentValue,
    input.candidateValue,
    inputDescriptor,
  );
  const afterSelected =
    input.intent === "toggle" && isManySelection(inputDescriptor)
      ? !beforeSelected
      : true;
  return {
    semanticEffects: [
      gameplaySetCandidateEffect({
        inputKey: input.inputKey,
        candidateValue:
          input.candidateValue as CanonicalBrowserInteractionValue,
        beforeSelected,
        afterSelected,
      }),
    ],
  };
}

export function gameplayResourceMetadata(input: {
  readonly inputKey: string;
  readonly resourceKey: unknown;
  readonly delta: -1 | 1;
}): {
  readonly semanticEffects: readonly GameplaySemanticEffect[];
} {
  return {
    semanticEffects: [
      gameplayAdjustResourceEffect({
        inputKey: input.inputKey,
        resourceKey: input.resourceKey as CanonicalBrowserInteractionValue,
        delta: input.delta,
      }),
    ],
  };
}

export function gameplayScalarStepMetadata(input: {
  readonly inputKey: string;
  readonly value: number;
}): {
  readonly semanticEffects: readonly GameplaySemanticEffect[];
} {
  return {
    semanticEffects: [
      gameplaySetScalarEffect({
        inputKey: input.inputKey,
        value: input.value,
      }),
    ],
  };
}

export function gameplayScalarFillMetadata(input: {
  readonly inputKey: string;
  readonly domain: Extract<InputDomain, { type: "boundedNumber" }>;
}): {
  readonly acceptedEffectPatterns: readonly GameplaySemanticEffectPattern[];
} {
  return {
    acceptedEffectPatterns: [
      boundedScalarPattern(input.inputKey, input.domain),
    ],
  };
}

export function gameplaySubmitMetadata(input: {
  readonly descriptor: Pick<InteractionDescriptor, "commit">;
  readonly explicitParams?: boolean;
}): {
  readonly intent: Extract<
    GameplayBrowserInteractionIntent,
    "invoke" | "submit"
  >;
  readonly semanticEffects: readonly GameplaySemanticEffect[];
} {
  const invoke =
    input.explicitParams === true || input.descriptor.commit.mode !== "manual";
  return invoke
    ? { intent: "invoke", semanticEffects: [gameplayInvokeEffect()] }
    : { intent: "submit", semanticEffects: [gameplayCommitEffect()] };
}

export function gameplayPreparationPatternsForDescriptor(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  draftValues: Readonly<Record<string, unknown>>,
): readonly GameplaySemanticEffectPattern[] {
  const patterns: GameplaySemanticEffectPattern[] = [];
  for (const rawInput of descriptor.inputs) {
    const input = resolveInputDomain(rawInput, draftValues);
    switch (input.domain.type) {
      case "choice":
      case "choiceList":
      case "cardTarget":
      case "boardTarget":
        patterns.push({
          kind: "match",
          effectKind: "setCandidate",
          fields: { inputKey: input.key },
        });
        break;
      case "resourceMap":
        patterns.push({
          kind: "match",
          effectKind: "adjustResource",
          fields: { inputKey: input.key },
        });
        break;
      case "boundedNumber":
        patterns.push(boundedScalarPattern(input.key, input.domain));
        break;
    }
  }
  return dedupePatterns(patterns);
}

function boundedScalarPattern(
  inputKey: string,
  domain: Extract<InputDomain, { type: "boundedNumber" }>,
): GameplaySemanticEffectPattern {
  const min = domain.min ?? 0;
  const max = domain.max;
  return {
    kind: "match",
    effectKind: "setScalar",
    fields: { inputKey },
    scalar: {
      field: "value",
      min,
      ...(max !== undefined && Number.isFinite(max) ? { max } : {}),
      ...(scalarIsInteger(domain) ? { integer: true } : {}),
    },
  };
}

function resolvedInputByKey(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  inputKey: string,
  draftValues: Readonly<Record<string, unknown>>,
): InteractionInputDescriptor | undefined {
  const input = inputByKey(descriptor, inputKey);
  return input ? resolveInputDomain(input, draftValues) : undefined;
}

function isCandidateSelected(
  currentValue: unknown,
  candidateValue: unknown,
  input: InteractionInputDescriptor,
): boolean {
  if (isTargetDomain(input.domain) && input.domain.selection?.mode === "many") {
    return valueArrayIncludes(currentValue, candidateValue);
  }
  if (input.domain.type === "choiceList") {
    return valueArrayIncludes(currentValue, candidateValue);
  }
  return String(currentValue) === String(candidateValue);
}

function isManySelection(input: InteractionInputDescriptor): boolean {
  if (input.domain.type === "choiceList") return true;
  return (
    isTargetDomain(input.domain) && input.domain.selection?.mode === "many"
  );
}

function valueArrayIncludes(currentValue: unknown, candidateValue: unknown) {
  return (
    Array.isArray(currentValue) &&
    currentValue.some((item) => String(item) === String(candidateValue))
  );
}

function scalarIsInteger(
  domain: Extract<InputDomain, { type: "boundedNumber" }>,
): boolean {
  const step = domain.step ?? 1;
  return (
    Number.isInteger(step) &&
    Number.isInteger(domain.min ?? 0) &&
    (domain.max === undefined || Number.isInteger(domain.max))
  );
}

function dedupePatterns(
  patterns: readonly GameplaySemanticEffectPattern[],
): readonly GameplaySemanticEffectPattern[] {
  const seen = new Set<string>();
  const result: GameplaySemanticEffectPattern[] = [];
  for (const pattern of patterns) {
    const key = JSON.stringify(pattern);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(pattern);
  }
  return result;
}
