import type {
  InputDomainDescriptor,
  InputSelectionDescriptor,
} from "../reducer/model/spec/inputs";

/** Projected domain rules only; schemas and authored target checks remain server-owned. */
export function inputDomainErrors(
  domain: InputDomainDescriptor,
  value: unknown,
  selection?: InputSelectionDescriptor,
  options: { ignoreMinimum?: boolean } = {},
): string[] {
  if (selection?.mode === "many") {
    if (!Array.isArray(value)) return ["Expected a list of values."];
    const errors = cardinalityErrors(
      value,
      selection.min,
      selection.max,
      "value",
      options.ignoreMinimum,
    );
    if (
      selection.distinct &&
      new Set(value.map(inputValueKey)).size !== value.length
    )
      errors.push("Choose each value only once.");
    if (
      value.some(
        (item) =>
          inputDomainErrors(domain, item, undefined, options).length > 0,
      )
    )
      errors.push(ineligibleMessage(domain));
    return errors;
  }
  switch (domain.type) {
    case "choice":
      return inputTargetInDomain(domain, value)
        ? []
        : [ineligibleMessage(domain)];
    case "choiceList": {
      if (!Array.isArray(value)) return ["Expected a list of choices."];
      const errors = cardinalityErrors(
        value,
        domain.min ?? 0,
        domain.max ?? domain.choices.length,
        "option",
        options.ignoreMinimum,
      );
      if (value.some((item) => !inputTargetInDomain(domain, item)))
        errors.push(ineligibleMessage(domain));
      return errors;
    }
    case "cardTarget":
    case "boardTarget":
      return inputTargetInDomain(domain, value)
        ? []
        : [ineligibleMessage(domain)];
    case "boundedNumber":
      return typeof value === "number" &&
        value >= domain.min &&
        value <= domain.max &&
        Math.abs(
          (value - domain.min) / (domain.step ?? 1) -
            Math.round((value - domain.min) / (domain.step ?? 1)),
        ) < 1e-9
        ? []
        : ["Value is outside the current input domain."];
    case "resourceMap":
      return typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value).every((key) =>
          domain.resources.some((entry) => entry.resourceId === key),
        ) &&
        domain.resources.every((entry) => {
          const amount =
            (value as Record<string, unknown>)[entry.resourceId] ?? 0;
          return (
            typeof amount === "number" &&
            Number.isInteger(amount) &&
            amount >= (entry.min ?? 0) &&
            amount <= (entry.max ?? Infinity)
          );
        })
        ? []
        : ["Value is outside the current input domain."];
  }
}

export function inputValueInDomain(
  domain: InputDomainDescriptor,
  value: unknown,
  selection?: InputSelectionDescriptor,
  options: { ignoreMinimum?: boolean } = {},
): boolean {
  return inputDomainErrors(domain, value, selection, options).length === 0;
}

/** One selectable option, including an option within a choiceList or many input. */
export function inputTargetInDomain(
  domain: InputDomainDescriptor,
  value: unknown,
): boolean {
  switch (domain.type) {
    case "choice":
    case "choiceList":
      return domain.choices.some(
        (choice) => !choice.disabled && Object.is(choice.value, value),
      );
    case "cardTarget":
    case "boardTarget":
      return domain.eligibleTargets.includes(
        typeof value === "object" && value !== null && "spaceId" in value
          ? String(value.spaceId)
          : String(value),
      );
    default:
      return inputValueInDomain(domain, value);
  }
}

function cardinalityErrors(
  value: readonly unknown[],
  min: number,
  max: number | undefined,
  unit: string,
  ignoreMinimum = false,
): string[] {
  const errors: string[] = [];
  if (!ignoreMinimum && value.length < min)
    errors.push(`Choose at least ${min} ${pluralize(unit, min)}.`);
  if (max !== undefined && value.length > max)
    errors.push(`Choose at most ${max} ${pluralize(unit, max)}.`);
  return errors;
}

function ineligibleMessage(domain: InputDomainDescriptor): string {
  return domain.type === "choice" || domain.type === "choiceList"
    ? "Selected choice is not eligible."
    : domain.type === "cardTarget" || domain.type === "boardTarget"
      ? "Selected target is not eligible."
      : "Value is outside the current input domain.";
}

/** Matches the reducer's JSON value identity for projected distinct selections. */
export function inputValueKey(value: unknown): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return `string:${value}`;
    case "number":
    case "boolean":
    case "undefined":
      return `${typeof value}:${String(value)}`;
    default:
      return `json:${JSON.stringify(value)}`;
  }
}

function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}
