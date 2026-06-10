import type { InteractionUiStore } from "../context/InteractionDraftContext.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";
import {
  applyInteractionInputDefaults,
  dependentInputKeys,
  hasInteractionFieldErrors,
  inputByKey,
  inputDependencyKeys,
  interactionArmScope,
  interactionInputKeys,
  isManyInput,
  isInputValueReady,
  isTargetDomain,
  resolveInputDomain,
  toggleManyValue,
  validateInteractionInputDomains,
} from "./interaction-inputs.js";

export interface InteractionDraftMutation {
  key: string;
  value: unknown;
}

export interface InteractionDraftReadiness {
  values: Record<string, unknown>;
  missingInputs: readonly string[];
  readyFrontier: readonly string[];
  blockedInputs: readonly string[];
  fieldErrors: Partial<Record<string, readonly string[]>>;
  ready: boolean;
}

export interface RoutedInteractionTarget {
  inputKey: string;
  value: string;
  extraInputs?: Record<string, unknown>;
}

export interface RoutedCardInputIntent {
  cardInputKey: string;
  cardId: string;
  dropTarget?: {
    inputKey: string;
    value: string;
  };
}

export interface RoutedInteractionTargetResult {
  params: Record<string, unknown>;
  readiness: InteractionDraftReadiness;
}

export function applyInteractionDraftMutation(
  store: Pick<InteractionUiStore, "getDraft" | "setInput" | "clearInput">,
  descriptor: InteractionDescriptor,
  mutations: readonly InteractionDraftMutation[],
): Record<string, unknown> {
  const originalDraft: Record<string, unknown> = {
    ...store.getDraft(descriptor.interactionKey),
  };
  const nextDraft: Record<string, unknown> = {
    ...originalDraft,
  };
  const mutatedKeys = new Set(mutations.map((mutation) => mutation.key));
  const changedKeys = new Set(
    mutations
      .filter((mutation) => originalDraft[mutation.key] !== mutation.value)
      .map((mutation) => mutation.key),
  );

  for (const { key, value } of mutations) {
    nextDraft[key] = value;
  }

  for (const { key } of mutations) {
    for (const dependentKey of dependentInputKeys(descriptor, key)) {
      if (mutatedKeys.has(dependentKey)) continue;
      if (
        changedKeys.has(key) ||
        shouldClearDependentInput(descriptor, nextDraft, dependentKey)
      ) {
        delete nextDraft[dependentKey];
        const defaultValue = defaultValueForInput(
          descriptor,
          nextDraft,
          dependentKey,
        );
        if (defaultValue !== undefined) {
          nextDraft[dependentKey] = defaultValue;
        }
      }
    }
  }

  const allKeys = new Set([
    ...Object.keys(originalDraft),
    ...Object.keys(nextDraft),
  ]);
  for (const key of allKeys) {
    if (!(key in nextDraft)) {
      store.clearInput(descriptor.interactionKey, key);
      continue;
    }
    if (originalDraft[key] !== nextDraft[key]) {
      store.setInput(descriptor.interactionKey, key, nextDraft[key]);
    }
  }

  return nextDraft;
}

function defaultValueForInput(
  descriptor: InteractionDescriptor,
  draft: Readonly<Record<string, unknown>>,
  inputKey: string,
): unknown {
  const input = inputByKey(descriptor, inputKey);
  if (!input || !("defaultValue" in input)) return undefined;
  const defaultValue = input.defaultValue;
  if (!isInputValueReady(resolveInputDomain(input, draft), defaultValue)) {
    return undefined;
  }
  const candidateDraft = { ...draft, [inputKey]: defaultValue };
  const errors = validateInteractionInputDomains(descriptor, candidateDraft);
  return (errors[inputKey]?.length ?? 0) > 0 ? undefined : defaultValue;
}

function shouldClearDependentInput(
  descriptor: InteractionDescriptor,
  draft: Readonly<Record<string, unknown>>,
  dependentKey: string,
): boolean {
  const input = inputByKey(descriptor, dependentKey);
  if (!input) return true;
  const value = draft[dependentKey];
  if (!isInputValueReady(resolveInputDomain(input, draft), value)) return true;
  const errors = validateInteractionInputDomains(descriptor, draft);
  return (errors[dependentKey]?.length ?? 0) > 0;
}

export function getInteractionDraftReadiness(
  descriptor: InteractionDescriptor,
  draft: Readonly<Record<string, unknown>>,
): InteractionDraftReadiness {
  const values = applyInteractionInputDefaults<Record<string, unknown>>(
    descriptor,
    draft,
  ) as Record<string, unknown>;
  const missingInputs = interactionInputKeys(descriptor).filter((key) => {
    const input = inputByKey(descriptor, key);
    const value = values[key];
    return input
      ? !isInputValueReady(resolveInputDomain(input, values), value)
      : value === null || value === undefined;
  });
  const missingInputSet = new Set(missingInputs);
  const readyFrontier = missingInputs.filter((key) => {
    const input = inputByKey(descriptor, key);
    if (!input) return true;
    return inputDependencyKeys(input).every((dependencyKey) => {
      if (missingInputSet.has(dependencyKey)) return false;
      const dependency = inputByKey(descriptor, dependencyKey);
      if (!dependency) return values[dependencyKey] !== undefined;
      return isInputValueReady(
        resolveInputDomain(dependency, values),
        values[dependencyKey],
      );
    });
  });
  const fieldErrors = validateInteractionInputDomains(descriptor, values);
  return {
    values,
    missingInputs,
    readyFrontier,
    blockedInputs: missingInputs.filter((key) => !readyFrontier.includes(key)),
    fieldErrors,
    ready:
      missingInputs.length === 0 && !hasInteractionFieldErrors(fieldErrors),
  };
}

export function routeInteractionTarget(
  store: Pick<InteractionUiStore, "getDraft" | "setInput" | "clearInput">,
  descriptor: InteractionDescriptor,
  target: RoutedInteractionTarget,
): RoutedInteractionTargetResult {
  const input = inputByKey(descriptor, target.inputKey);
  const currentDraft = store.getDraft(descriptor.interactionKey);
  const selection = isTargetDomain(input?.domain)
    ? input.domain.selection
    : undefined;
  const targetValue =
    selection?.mode === "many"
      ? toggleManyValue(currentDraft[target.inputKey], target.value, selection)
      : target.value;
  const params = applyInteractionDraftMutation(store, descriptor, [
    ...Object.entries(target.extraInputs ?? {}).map(([key, value]) => ({
      key,
      value,
    })),
    { key: target.inputKey, value: targetValue },
  ]);
  return {
    params,
    readiness: getInteractionDraftReadiness(descriptor, params),
  };
}

export function routeCardInputIntent(
  store: Pick<InteractionUiStore, "getDraft" | "setInput" | "clearInput">,
  descriptor: InteractionDescriptor,
  intent: RoutedCardInputIntent,
): RoutedInteractionTargetResult {
  return routeInteractionTarget(store, descriptor, {
    inputKey: intent.cardInputKey,
    value: intent.cardId,
    extraInputs: intent.dropTarget
      ? { [intent.dropTarget.inputKey]: intent.dropTarget.value }
      : undefined,
  });
}

export function shouldRouteInteractionPending(
  descriptor: InteractionDescriptor,
  readiness: Pick<InteractionDraftReadiness, "ready">,
): boolean {
  return descriptor.commit.mode !== "autoWhenReady" || !readiness.ready;
}

export function shouldAutoSubmitInteraction(
  descriptor: InteractionDescriptor,
): boolean {
  return (
    descriptor.commit.mode === "autoWhenReady" &&
    !descriptor.inputs.some((input) => isManyInput(input))
  );
}

export function markInteractionPending(
  store: Pick<InteractionUiStore, "arm" | "setPendingInteraction">,
  descriptor: InteractionDescriptor,
): void {
  store.arm(interactionArmScope(descriptor), descriptor.interactionKey);
  store.setPendingInteraction(descriptor.interactionKey);
}

export function clearInteractionRoute(
  store: Pick<
    InteractionUiStore,
    | "clearInput"
    | "getArmed"
    | "arm"
    | "getPendingInteraction"
    | "setPendingInteraction"
  >,
  descriptor: InteractionDescriptor,
): void {
  const armScope = interactionArmScope(descriptor);
  store.clearInput(descriptor.interactionKey);
  if (store.getArmed(armScope) === descriptor.interactionKey) {
    store.arm(armScope, null);
  }
  if (store.getPendingInteraction() === descriptor.interactionKey) {
    store.setPendingInteraction(null);
  }
}

export function claimInteractionSubmit(
  store: Pick<InteractionUiStore, "claimSubmitting">,
  descriptor: InteractionDescriptor,
): boolean {
  return store.claimSubmitting(descriptor.interactionKey);
}
