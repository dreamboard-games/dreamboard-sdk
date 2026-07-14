import type {
  InteractionDescriptor,
  InteractionInputDescriptor,
  InputDomain,
  InputSelection,
} from "../types/plugin-state.js";

export type BoardTargetKind = "edge" | "vertex" | "space" | "tile";

export function interactionInputKeys(
  descriptor: Pick<InteractionDescriptor, "inputs">,
): string[] {
  return descriptor.inputs.map((input) => input.key);
}

export function applyInteractionInputDefaults<
  Params extends Record<string, unknown>,
>(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  params: Readonly<Partial<Params>>,
): Partial<Params> {
  const next: Record<string, unknown> = { ...params };
  for (const input of descriptor.inputs) {
    if (next[input.key] !== undefined) continue;
    if (!("defaultValue" in input)) continue;
    next[input.key] = input.defaultValue;
  }
  return next as Partial<Params>;
}

export function resolveInputDomain(
  input: InteractionInputDescriptor,
  params: Readonly<Record<string, unknown>>,
): InteractionInputDescriptor {
  const dependencies = input.domain.dependencies;
  if (dependencies?.mode !== "eager") return input;
  const dependencyKeys = inputDependencyKeys(input);
  if (dependencyKeys.length === 0) return input;
  const caseMatch = dependencies.dependentCases.find((candidate) =>
    dependencyKeys.every(
      (key) =>
        params[key] !== undefined &&
        params[key] !== null &&
        String(params[key]) === candidate.when[key],
    ),
  );
  if (!caseMatch) return input;
  return {
    ...input,
    domain: caseMatch.domain,
  };
}

export function resolveInteractionInputs(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  params: Readonly<Record<string, unknown>>,
): InteractionInputDescriptor[] {
  return descriptor.inputs.map((input) => resolveInputDomain(input, params));
}

export function dependentInputKeys(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  changedKey: string,
): string[] {
  const dependentsByKey = new Map<string, string[]>();
  for (const input of descriptor.inputs) {
    for (const dependency of inputDependencyKeys(input)) {
      dependentsByKey.set(dependency, [
        ...(dependentsByKey.get(dependency) ?? []),
        input.key,
      ]);
    }
  }
  const result: string[] = [];
  const queue = [...(dependentsByKey.get(changedKey) ?? [])];
  while (queue.length > 0) {
    const key = queue.shift();
    if (!key || result.includes(key)) continue;
    result.push(key);
    queue.push(...(dependentsByKey.get(key) ?? []));
  }
  return result;
}

export function validateInteractionInputDomains(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  params: Readonly<Record<string, unknown>>,
): Partial<Record<string, readonly string[]>> {
  const fieldErrors: Record<string, string[]> = {};

  for (const rawInput of descriptor.inputs) {
    const input = resolveInputDomain(rawInput, params);
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
  if (value === undefined || value === null) return false;
  const selection = inputSelection(input);
  if (selection?.mode !== "many") return true;
  return Array.isArray(value) && value.length >= selection.min;
}

export function isManyInput(input: InteractionInputDescriptor): boolean {
  return inputSelection(input)?.mode === "many";
}

export function maxSelectedForInput(
  input: InteractionInputDescriptor,
): number | undefined {
  const selection = inputSelection(input);
  return selection?.mode === "many" ? selection.max : undefined;
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

export function mergeInteractionFieldErrors(
  ...sources: Array<Partial<Record<string, readonly string[]>>>
): Partial<Record<string, readonly string[]>> {
  const merged: Record<string, string[]> = {};
  for (const source of sources) {
    for (const [key, messages] of Object.entries(source)) {
      if (!messages || messages.length === 0) continue;
      merged[key] = [...(merged[key] ?? []), ...messages];
    }
  }
  return merged;
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

export function inputByTarget(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  targetKind: BoardTargetKind | "card",
  targetId: string,
  params: Readonly<Record<string, unknown>> = {},
): InteractionInputDescriptor | null {
  for (const rawInput of descriptor.inputs) {
    const input = resolveInputDomain(rawInput, params);
    if (!isResolvedTargetDomain(input.domain)) continue;
    if (inputTargetKind(input.domain) !== targetKind) continue;
    if (input.domain.eligibleTargets.includes(targetId)) return input;
  }
  return null;
}

export function eligibleTargetsForInput(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  key: string,
  params: Readonly<Record<string, unknown>> = {},
): readonly string[] | undefined {
  const rawInput = inputByKey(descriptor, key);
  const domain = rawInput ? resolveInputDomain(rawInput, params).domain : null;
  return domain && isResolvedTargetDomain(domain)
    ? domain.eligibleTargets
    : undefined;
}

export function eligibleTargetsByInput(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  params: Readonly<Record<string, unknown>> = {},
): Record<string, readonly string[]> {
  return Object.fromEntries(
    descriptor.inputs.flatMap((rawInput) => {
      const input = resolveInputDomain(rawInput, params);
      const targets = isResolvedTargetDomain(input.domain)
        ? input.domain.eligibleTargets
        : undefined;
      return targets ? [[input.key, targets]] : [];
    }),
  );
}

export function eligibleTargetsByBoardKind(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  params: Readonly<Record<string, unknown>> = {},
): Partial<Record<BoardTargetKind, readonly string[]>> {
  const result: Record<BoardTargetKind, Set<string>> = {
    edge: new Set<string>(),
    vertex: new Set<string>(),
    space: new Set<string>(),
    tile: new Set<string>(),
  };
  for (const rawInput of descriptor.inputs) {
    const input = resolveInputDomain(rawInput, params);
    if (
      input.domain.type !== "boardTarget" ||
      input.domain.projection !== "resolved"
    ) {
      continue;
    }
    const targetKind = input.domain.targetKind;
    if (!isBoardTargetKind(targetKind)) continue;
    for (const targetId of input.domain.eligibleTargets) {
      result[targetKind].add(targetId);
    }
  }
  return Object.fromEntries(
    Object.entries(result).flatMap(([kind, ids]) =>
      ids.size > 0 ? [[kind, [...ids]]] : [],
    ),
  ) as Partial<Record<BoardTargetKind, readonly string[]>>;
}

export function hasBoardTargetInput(
  descriptor: Pick<InteractionDescriptor, "inputs">,
): boolean {
  return boardTargetKindsOf(descriptor).length > 0;
}

export function hasCardTargetInput(
  descriptor: Pick<InteractionDescriptor, "inputs">,
): boolean {
  return descriptor.inputs.some((input) => input.domain.type === "cardTarget");
}

export function interactionArmScope(
  descriptor: Pick<
    InteractionDescriptor,
    "inputs" | "interactionKey" | "zoneId"
  >,
): string {
  const boardKinds = boardTargetKindsOf(descriptor);
  if (boardKinds.length === 1) return `board:${boardKinds[0]}`;
  if (boardKinds.length > 1) return "board";
  if (descriptor.zoneId) return `zone:${descriptor.zoneId}`;
  return `interaction:${descriptor.interactionKey}`;
}

export function inputKeyForTarget(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  targetKind: BoardTargetKind | "card",
  targetId: string,
  params: Readonly<Record<string, unknown>> = {},
): string | null {
  return inputByTarget(descriptor, targetKind, targetId, params)?.key ?? null;
}

export function inputDependencyKeys(
  input: InteractionInputDescriptor,
): readonly string[] {
  const dependencies = input.domain.dependencies;
  if (!dependencies) return [];
  if (dependencies.mode === "lazy") return dependencies.dependsOn;
  const keys = new Set<string>();
  for (const candidate of dependencies.dependentCases) {
    for (const key of Object.keys(candidate.when)) {
      keys.add(key);
    }
  }
  return [...keys];
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

export function isCardTargetDomain(
  domain: InputDomain | undefined,
): domain is Extract<InputDomain, { type: "cardTarget" }> {
  if (!domain) return false;
  return domain.type === "cardTarget";
}

export function isBoardTargetDomain(
  domain: InputDomain | undefined,
): domain is Extract<InputDomain, { type: "boardTarget" }> {
  if (!domain) return false;
  return domain.type === "boardTarget";
}

export function inputTargetKind(
  domain: InputDomain,
): BoardTargetKind | "card" | string | undefined {
  if (domain.type === "cardTarget") return "card";
  if (domain.type === "boardTarget") return domain.targetKind;
  return undefined;
}

function boardTargetKindsOf(
  descriptor: Pick<InteractionDescriptor, "inputs">,
): BoardTargetKind[] {
  const kinds = new Set<BoardTargetKind>();
  for (const input of descriptor.inputs) {
    if (input.domain.type !== "boardTarget") continue;
    if (isBoardTargetKind(input.domain.targetKind)) {
      kinds.add(input.domain.targetKind);
    }
  }
  return [...kinds];
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

function isBoardTargetKind(value: unknown): value is BoardTargetKind {
  return (
    value === "edge" ||
    value === "vertex" ||
    value === "space" ||
    value === "tile"
  );
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
