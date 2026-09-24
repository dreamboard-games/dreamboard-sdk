import type {
  InputDomainDescriptor,
  InputSelectionDescriptor,
} from "../reducer/model/spec/inputs";

/** Projected domain membership only; schema and authored target checks remain server-owned. */
export function inputValueInDomain(
  domain: InputDomainDescriptor,
  value: unknown,
  selection?: InputSelectionDescriptor,
  options: { ignoreMinimum?: boolean } = {},
): boolean {
  if (selection?.mode === "many") {
    return (
      Array.isArray(value) &&
      value.every((item) =>
        inputValueInDomain(domain, item, undefined, options),
      )
    );
  }
  switch (domain.type) {
    case "choice":
      return domain.choices.some(
        (choice) => !choice.disabled && choice.value === value,
      );
    case "choiceList":
      return (
        Array.isArray(value) &&
        value.length >= (options.ignoreMinimum ? 0 : (domain.min ?? 0)) &&
        value.length <= (domain.max ?? Infinity) &&
        value.every((item) =>
          domain.choices.some(
            (choice) => !choice.disabled && choice.value === item,
          ),
        )
      );
    case "cardTarget":
    case "boardTarget": {
      const values = [value];
      return values.every((item) =>
        domain.eligibleTargets.includes(
          typeof item === "object" && item !== null && "spaceId" in item
            ? String(item.spaceId)
            : String(item),
        ),
      );
    }
    case "boundedNumber":
      return (
        typeof value === "number" &&
        value >= domain.min &&
        value <= domain.max &&
        Math.abs(
          (value - domain.min) / (domain.step ?? 1) -
            Math.round((value - domain.min) / (domain.step ?? 1)),
        ) < 1e-9
      );
    case "resourceMap":
      return (
        typeof value === "object" &&
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
      );
  }
}
