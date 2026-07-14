export function interactionDomainEligibleCount(
  domain: unknown,
): number | "lazy" {
  if (!domain || typeof domain !== "object") return "lazy";
  const typed = domain as {
    type?: string;
    projection?: string;
    eligibleTargets?: readonly unknown[];
    choices?: readonly { disabled?: boolean }[];
    resources?: readonly unknown[];
    min?: number;
    max?: number;
    step?: number;
  };
  if (
    (typed.type === "cardTarget" || typed.type === "boardTarget") &&
    typed.projection === "resolved"
  ) {
    return typed.eligibleTargets?.length ?? 0;
  }
  if (typed.type === "choice" || typed.type === "choiceList") {
    return (typed.choices ?? []).filter((choice) => !choice.disabled).length;
  }
  if (typed.type === "resourceMap") {
    return typed.resources?.length ?? 0;
  }
  if (
    typed.type === "boundedNumber" &&
    typeof typed.min === "number" &&
    typeof typed.max === "number"
  ) {
    const step =
      typeof typed.step === "number" && typed.step > 0 ? typed.step : 1;
    return Math.max(0, Math.floor((typed.max - typed.min) / step) + 1);
  }
  return "lazy";
}
