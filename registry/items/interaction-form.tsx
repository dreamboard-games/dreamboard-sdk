import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InputControl } from "@dreamboard-games/sdk";
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
/** Descriptor-driven current-step fields. Saved server selections are never replayed. */
export function InteractionForm({
  interaction: key,
  className,
  renderInput,
}: InteractionFormProps) {
  const interaction = useGame((game) => game.interactions.find(key));
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
      {interaction.getInputs().map((typedInput) => {
        const custom = renderInput?.(typedInput);
        if (custom !== undefined)
          return <div key={typedInput.key}>{custom}</div>;
        return (
          <Control key={typedInput.key} control={typedInput.getControl()} />
        );
      })}
      <Actions interaction={key} />
    </section>
  );
}

function Control({ control }: { control: InputControl }) {
  if (control.type === "boundedNumber") {
    const attributes = {
      type: "number",
      min: control.domain.min,
      max: control.domain.max,
      step: control.domain.step ?? 1,
    };
    if (control.mode === "single")
      return (
        <Label className="m-1 inline-flex flex-col items-start gap-1">
          {control.key}
          <Input
            className="min-h-11 max-w-32"
            {...control.props}
            {...attributes}
            value={control.value ?? ""}
            onChange={(event) =>
              control.setValue(
                event.currentTarget.value === ""
                  ? undefined
                  : event.currentTarget.valueAsNumber,
              )
            }
          />
        </Label>
      );
    return (
      <fieldset className="my-4" disabled={control.disabled}>
        <legend>{control.key}</legend>
        {control.value.map((value, index) => (
          <div key={index}>
            <Label className="m-1 inline-flex flex-col items-start gap-1">
              {control.key} {index + 1}
              <Input
                className="min-h-11 max-w-32"
                {...control.props}
                {...attributes}
                value={value}
                onChange={(event) =>
                  control.setValue(
                    event.currentTarget.value === ""
                      ? control.value.filter((_, row) => row !== index)
                      : control.value.map((previous, row) =>
                          row === index
                            ? event.currentTarget.valueAsNumber
                            : previous,
                        ),
                  )
                }
              />
            </Label>
            <Button
              variant="outline"
              className="m-1 min-h-11 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              type="button"
              onClick={() =>
                control.setValue(
                  control.value.filter((_, row) => row !== index),
                )
              }
            >
              Remove value {index + 1}
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          className="m-1 min-h-11 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          type="button"
          disabled={
            control.value.length >=
            (control.domain.selection?.mode === "many"
              ? (control.domain.selection.max ?? Infinity)
              : Infinity)
          }
          onClick={() =>
            control.setValue([...control.value, control.domain.min])
          }
        >
          Add value
        </Button>
      </fieldset>
    );
  }
  if (control.type === "resourceMap") {
    const empty = Object.fromEntries(
      control.domain.resources.map((resource) => [resource.resourceId, 0]),
    );
    const row = (
      value: Record<string, number>,
      change: (value: Record<string, number>) => void,
    ) =>
      control.domain.resources.map((resource) => (
        <Label
          className="m-1 inline-flex flex-col items-start gap-1"
          key={resource.resourceId}
        >
          {resource.label ?? resource.resourceId}
          <Input
            className="min-h-11 max-w-32"
            {...control.props}
            type="number"
            min={resource.min}
            max={resource.max}
            step={1}
            value={value[resource.resourceId] ?? 0}
            data-resource={resource.resourceId}
            onChange={(event) =>
              change({
                ...value,
                [resource.resourceId]:
                  event.currentTarget.value === ""
                    ? 0
                    : event.currentTarget.valueAsNumber,
              })
            }
          />
        </Label>
      ));
    if (control.mode === "single")
      return (
        <fieldset className="my-4" disabled={control.disabled}>
          <legend>{control.key}</legend>
          {row(control.value ?? empty, control.setValue)}
        </fieldset>
      );
    return (
      <fieldset className="my-4" disabled={control.disabled}>
        <legend>{control.key}</legend>
        {control.value.map((value, index) => (
          <fieldset className="my-4" key={index}>
            <legend>Allocation {index + 1}</legend>
            {row(value, (next) =>
              control.setValue(
                control.value.map((previous, row) =>
                  row === index ? next : previous,
                ),
              ),
            )}
            <Button
              variant="outline"
              className="m-1 min-h-11 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              type="button"
              onClick={() =>
                control.setValue(
                  control.value.filter((_, row) => row !== index),
                )
              }
            >
              Remove allocation {index + 1}
            </Button>
          </fieldset>
        ))}
        <Button
          variant="outline"
          className="m-1 min-h-11 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          type="button"
          disabled={
            control.value.length >=
            (control.domain.selection?.mode === "many"
              ? (control.domain.selection.max ?? Infinity)
              : Infinity)
          }
          onClick={() => control.setValue([...control.value, empty])}
        >
          Add allocation
        </Button>
      </fieldset>
    );
  }
  return (
    <fieldset className="my-4" disabled={control.disabled}>
      <legend>{control.key}</legend>
      {control.options.map((option, index) => (
        <Button
          variant="outline"
          className="m-1 min-h-11 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          key={index}
          {...option.props}
          aria-pressed={option.selected}
        >
          {option.label}
        </Button>
      ))}
      {control.options.length === 0 && <p>No choices available</p>}
    </fieldset>
  );
}
