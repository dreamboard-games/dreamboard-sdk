import { useGame } from "@game";
import type { ReactNode } from "react";
import { Actions, type BoundInteraction, type InteractionKey } from "./actions";
export interface InteractionFormProps {
  interaction: InteractionKey;
  className?: string;
  renderInput?(
    input: ReturnType<BoundInteraction["getInputs"]>[number],
  ): ReactNode | undefined;
}
function record<T>(value: T): value is T & Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** Descriptor-driven current-step fields. Saved server selections are never replayed. */
export function InteractionForm({
  interaction: key,
  className,
  renderInput,
}: InteractionFormProps) {
  const interaction = useGame((game) => game.interactions.get(key));
  if (!interaction) return null;
  const step = interaction.getStep();
  return (
    <section
      className={`db-interaction-form ${className ?? ""}`}
      aria-label={interaction.label}
    >
      <h3>{interaction.label}</h3>
      {interaction.help && <p>{interaction.help}</p>}
      {step && (
        <>
          <p>Step {step.index + 1}</p>
          <dl aria-label="Saved choices">
            {Object.entries(step.selected).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>
                  {typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {interaction.getInputs().map((input) => {
        const custom = renderInput?.(input);
        if (custom !== undefined) return <div key={input.key}>{custom}</div>;
        const domain = input.getDomain();
        const current: unknown = input.getValue();
        const field = input.getFieldProps();
        if (domain.type === "resourceMap") {
          const resources = domain.resources;
          const values: Record<string, number> = Object.fromEntries(
            resources.map((resource) => [
              resource.resourceId,
              record(current) ? Number(current[resource.resourceId] ?? 0) : 0,
            ]),
          );
          return (
            <fieldset key={input.key} disabled={field.disabled}>
              <legend>{input.key}</legend>
              {resources.map((resource) => (
                <label key={resource.resourceId}>
                  {resource.label ?? resource.resourceId}
                  <input
                    type="number"
                    min={resource.min}
                    max={resource.max}
                    step={1}
                    value={values[resource.resourceId]}
                    data-interaction={key}
                    data-input={input.key}
                    data-resource={resource.resourceId}
                    onChange={(event) => {
                      const next = {
                        ...values,
                        [resource.resourceId]:
                          event.currentTarget.value === ""
                            ? 0
                            : event.currentTarget.valueAsNumber,
                      };
                      // Iterating heterogeneous inputs erases key/value correlation.
                      // The descriptor owns this resource bag; setValue retains unfinished edits.
                      input.setValue(next as never);
                    }}
                  />
                </label>
              ))}
            </fieldset>
          );
        }
        if (domain.type === "boundedNumber")
          return (
            <label key={input.key}>
              {input.key}
              <input
                {...field}
                value={typeof current === "number" ? current : ""}
                type="number"
                min={domain.min}
                max={domain.max}
                step={domain.step ?? 1}
              />
            </label>
          );
        const choices =
          domain.type === "choice" || domain.type === "choiceList"
            ? domain.choices
            : [];
        return (
          <fieldset key={input.key}>
            <legend>{input.key}</legend>
            {input.getEligibleTargets().map((value, index) => {
              const option = choices.find((choice) => choice.value === value);
              return (
                <button
                  key={index}
                  {...input.getTargetProps(value)}
                  aria-pressed={input.getIsSelected(value)}
                >
                  {String(
                    option?.label ??
                      (value === null
                        ? "None"
                        : typeof value === "object"
                          ? JSON.stringify(value)
                          : value),
                  )}
                </button>
              );
            })}
            {input.getEligibleTargets().length === 0 && (
              <p>No choices available</p>
            )}
          </fieldset>
        );
      })}
      <Actions interaction={key} />
    </section>
  );
}
