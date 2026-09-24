import type {
  InteractionDescriptor,
  InteractionInputDescriptor,
  InputDomain,
  InputSelection,
} from "../shared/protocol/frame.js";

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
    if (value === undefined || value === null) continue;

    const selectionErrors = validateInputSelection(input, value);
    for (const error of selectionErrors) {
      pushFieldError(fieldErrors, input.key, error);
    }

    if (input.domain.type === "choiceList") {
      if (!Array.isArray(value)) {
        pushFieldError(fieldErrors, input.key, "Expected a list of choices.");
        continue;
      }

      const min = input.domain.min ?? 0;
      const max =
        input.domain.max ??
        input.domain.choices?.length ??
        Number.POSITIVE_INFINITY;
      if (value.length < min) {
        pushFieldError(
          fieldErrors,
          input.key,
          `Choose at least ${min} ${pluralize("option", min)}.`,
        );
      }
      if (value.length > max) {
        pushFieldError(
          fieldErrors,
          input.key,
          `Choose at most ${max} ${pluralize("option", max)}.`,
        );
      }
      const allowed = new Set(
        input.domain.choices?.map((choice) => choice.value),
      );
      if (
        allowed.size > 0 &&
        value.some((item) => !allowed.has(String(item)))
      ) {
        pushFieldError(
          fieldErrors,
          input.key,
          "Selected choice is not eligible.",
        );
      }
    }

    if (input.domain.type === "choice") {
      const allowed = new Set(
        input.domain.choices?.map((choice) => choice.value),
      );
      if (allowed.size > 0 && !allowed.has(value as string | null)) {
        pushFieldError(
          fieldErrors,
          input.key,
          "Selected choice is not eligible.",
        );
      }
    }

    if (isResolvedTargetDomain(input.domain)) {
      const values = valuesForSelection(input.domain.selection, value);
      for (const item of values) {
        if (!input.domain.eligibleTargets.includes(String(item))) {
          pushFieldError(
            fieldErrors,
            input.key,
            "Selected target is not eligible.",
          );
          break;
        }
      }
    }
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
  value: string,
  selection: InputSelection,
): string[] {
  if (selection.mode !== "many") return [value];
  const previous = Array.isArray(current)
    ? current.map((item) => String(item))
    : [];
  const existing = previous.indexOf(value);
  if (existing >= 0) {
    return previous.filter((item) => item !== value);
  }
  if (selection.max !== undefined && previous.length >= selection.max) {
    return previous;
  }
  return [...previous, value];
}

export function isManyTargetSelectable(
  input: InteractionInputDescriptor,
  current: unknown,
  targetId: string,
): boolean {
  const selection = inputSelection(input);
  if (selection?.mode !== "many") return true;
  const currentValues = Array.isArray(current)
    ? current.map((item) => String(item))
    : [];
  if (currentValues.includes(targetId)) return true;
  if (selection.distinct && currentValues.includes(targetId)) return false;
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

export function isTargetDomain(
  domain: InputDomain | undefined,
): domain is Extract<InputDomain, { type: "cardTarget" | "boardTarget" }> {
  if (!domain) return false;
  return domain.type === "cardTarget" || domain.type === "boardTarget";
}

export function isResolvedTargetDomain(
  domain: InputDomain,
): domain is Extract<InputDomain, { projection: "resolved" }> {
  return (
    (domain.type === "cardTarget" || domain.type === "boardTarget") &&
    domain.projection === "resolved"
  );
}

function validateInputSelection(
  input: InteractionInputDescriptor,
  value: unknown,
): string[] {
  const selection = inputSelection(input);
  if (selection?.mode !== "many") return [];
  if (!Array.isArray(value)) return ["Expected a list of values."];
  const errors: string[] = [];
  const min = selection.min;
  if (value.length < min) {
    errors.push(`Choose at least ${min} ${pluralize("value", min)}.`);
  }
  if (selection.max !== undefined && value.length > selection.max) {
    errors.push(
      `Choose at most ${selection.max} ${pluralize("value", selection.max)}.`,
    );
  }
  if (selection.distinct) {
    const seen = new Set<string>();
    for (const item of value) {
      const key = String(item);
      if (seen.has(key)) {
        errors.push("Choose each value only once.");
        break;
      }
      seen.add(key);
    }
  }
  return errors;
}

function valuesForSelection(
  selection: InputSelection | undefined,
  value: unknown,
): readonly unknown[] {
  if (selection?.mode === "many") return Array.isArray(value) ? value : [];
  return [value];
}

function inputSelection(
  input: InteractionInputDescriptor,
): InputSelection | undefined {
  return "selection" in input.domain ? input.domain.selection : undefined;
}

function pushFieldError(
  fieldErrors: Record<string, string[]>,
  key: string,
  message: string,
): void {
  fieldErrors[key] = [...(fieldErrors[key] ?? []), message];
}

function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}
