import type {
  InteractionDescriptor,
  InteractionInputDescriptor,
  InputSelection,
} from "../shared/protocol/frame.js";
import { inputDomainErrors, inputValueKey } from "../shared/input-domain.js";
import type { RuntimeJson } from "../shared/runtime-json.js";

export function interactionInputKeys(
  descriptor: Pick<InteractionDescriptor, "inputs">,
): string[] {
  return descriptor.inputs.map((input) => input.key);
}

export function applyInteractionInputDefaults<
  Params extends Record<string, unknown>,
>(
  descriptor: Pick<InteractionDescriptor, "inputs" | "step">,
  params: Readonly<Partial<Params>>,
): Partial<Params> {
  const next: Record<string, unknown> = descriptor.step
    ? Object.fromEntries(
        Object.entries(params).filter(([key]) =>
          descriptor.inputs.some((input) => input.key === key),
        ),
      )
    : { ...params };
  for (const input of descriptor.inputs) {
    if (next[input.key] !== undefined) continue;
    if (!("defaultValue" in input)) continue;
    next[input.key] = input.defaultValue;
  }
  return next as Partial<Params>;
}

export function validateInteractionInputDomains(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  params: Readonly<Record<string, unknown>>,
): Partial<Record<string, readonly string[]>> {
  const fieldErrors: Record<string, string[]> = {};

  for (const rawInput of descriptor.inputs) {
    const input = rawInput;
    const value = params[input.key];
    if (value === undefined) continue;
    for (const error of inputDomainErrors(
      input.domain,
      value,
      input.domain.selection,
    ))
      pushFieldError(fieldErrors, input.key, error);
  }

  return fieldErrors;
}

export function isInputValueReady(
  input: InteractionInputDescriptor,
  value: unknown,
): boolean {
  if (value === undefined) return false;
  if (value === null)
    return (
      input.domain.type === "choice" &&
      (input.domain.choices ?? []).some(
        (choice) => choice.value === null && !choice.disabled,
      )
    );
  const selection = inputSelection(input);
  if (selection?.mode !== "many") return true;
  return Array.isArray(value) && value.length >= selection.min;
}

export function isManyInput(input: InteractionInputDescriptor): boolean {
  return inputSelection(input)?.mode === "many";
}

export function toggleManyValue(
  current: unknown,
  value: RuntimeJson,
  selection: InputSelection,
): RuntimeJson[] {
  if (selection.mode !== "many") return [value];
  const previous = Array.isArray(current) ? (current as RuntimeJson[]) : [];
  const existing = previous.findIndex((item) => sameValue(item, value));
  if (existing >= 0) {
    return previous.filter((item) => !sameValue(item, value));
  }
  if (selection.max !== undefined && previous.length >= selection.max) {
    return previous;
  }
  return [...previous, value];
}

export function isManyTargetSelectable(
  input: InteractionInputDescriptor,
  current: unknown,
  targetId: RuntimeJson,
): boolean {
  const selection = inputSelection(input);
  if (selection?.mode !== "many") return true;
  const currentValues = Array.isArray(current)
    ? (current as RuntimeJson[])
    : [];
  if (currentValues.some((item) => sameValue(item, targetId))) return true;
  return selection.max === undefined || currentValues.length < selection.max;
}

export function hasInteractionFieldErrors(
  fieldErrors: Partial<Record<string, readonly string[]>>,
): boolean {
  return Object.values(fieldErrors).some(
    (messages) => (messages?.length ?? 0) > 0,
  );
}

export function inputByKey(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  key: string,
): InteractionInputDescriptor | undefined {
  return descriptor.inputs.find((input) => input.key === key);
}

export function inputSelection(
  input: InteractionInputDescriptor,
): InputSelection | undefined {
  if (input.domain.selection) return input.domain.selection;
  // choiceList is already an array domain; expose its selection bounds for toggling and reconciliation.
  if (input.domain.type === "choiceList")
    return {
      mode: "many",
      min: input.domain.min ?? 0,
      max: input.domain.max ?? input.domain.choices.length,
    };
  return undefined;
}

function pushFieldError(
  fieldErrors: Record<string, string[]>,
  key: string,
  message: string,
): void {
  fieldErrors[key] = [...(fieldErrors[key] ?? []), message];
}

function sameValue(left: RuntimeJson, right: RuntimeJson): boolean {
  return inputValueKey(left) === inputValueKey(right);
}
