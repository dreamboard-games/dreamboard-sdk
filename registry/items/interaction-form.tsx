import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InputControl, RuntimeJson } from "@dreamboard-games/sdk";
import { useGame } from "@game";
import { useId, useRef, type ReactNode } from "react";
import { Actions, type BoundInteraction, type InteractionKey } from "./actions";
export interface InteractionFormProps {
  interaction: InteractionKey;
  className?: string;
  /** Field labels by input key. A key reads as words otherwise: `targetPlayerId` is "Target player". */
  labels?: Readonly<Record<string, string>>;
  renderInput?(
    input: ReturnType<BoundInteraction["getInputs"]>[number],
  ): ReactNode | undefined;
}
/** Descriptor-driven current-step fields. Saved server selections are never replayed. */
export function InteractionForm({
  interaction: key,
  className = "",
  labels,
  renderInput,
}: InteractionFormProps) {
  const interaction = useGame((game) => game.interactions.find(key));
  if (!interaction) return null;
  const step = interaction.getStep();
  const label = (input: string) => labels?.[input] ?? readable(input);
  return (
    <section
      className={`db-interaction-form grid gap-3 ${className}`}
      aria-label={interaction.label}
    >
      <h3>{interaction.label}</h3>
      {interaction.help && <p>{interaction.help}</p>}
      {step && (
        <>
          <p>
            Step {step.index + 1} of {step.total}
          </p>
          <dl aria-label="Saved choices">
            {Object.entries(step.selected).map(([input, value]) => (
              <div key={input} className="flex gap-2">
                <dt>{label(input)}:</dt>
                <dd className="m-0">{describe(value)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {interaction.getInputs().map((input) => {
        const custom = renderInput?.(input);
        if (custom !== undefined) return <div key={input.key}>{custom}</div>;
        return (
          <Control
            key={input.key}
            control={input.getControl()}
            label={label(input.key)}
          />
        );
      })}
      <Actions interaction={key} />
    </section>
  );
}

/** `targetPlayerId` reads "Target player". */
function readable(key: string) {
  const words = key
    .replace(/Ids?$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
function describe(value: RuntimeJson): string {
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(describe).join(", ");
  if (typeof value === "object")
    return (
      Object.entries(value)
        .filter(([, amount]) => amount !== 0)
        .map(
          ([key, amount]) =>
            `${describe(amount)} ${readable(key).toLowerCase()}`,
        )
        .join(", ") || "None"
    );
  return String(value);
}

const removable =
  "min-h-11 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground";
function Control({ control, label }: { control: InputControl; label: string }) {
  if (control.type === "boundedNumber") {
    const { min, max, step = 1 } = control.domain;
    if (control.mode === "single")
      return (
        <Stepper
          label={label}
          value={control.value}
          bounds={{ min, max, step }}
          disabled={control.disabled}
          inputProps={control.props}
          onChange={control.setValue}
        />
      );
    return (
      <fieldset className="grid gap-2" disabled={control.disabled}>
        <legend>{label}</legend>
        {control.value.map((value, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <Stepper
              label={`${label} ${index + 1}`}
              value={value}
              bounds={{ min, max, step }}
              disabled={control.disabled}
              inputProps={control.props}
              onChange={(next) =>
                control.setValue(
                  next === undefined
                    ? control.value.filter((_, row) => row !== index)
                    : control.value.map((previous, row) =>
                        row === index ? next : previous,
                      ),
                )
              }
            />
            <Button
              variant="outline"
              className={removable}
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
          className={`${removable} justify-self-start`}
          type="button"
          disabled={control.value.length >= manyLimit(control.domain)}
          onClick={() => control.setValue([...control.value, min])}
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
    ) => (
      <div className="flex flex-wrap gap-3">
        {control.domain.resources.map((resource) => (
          <Stepper
            key={resource.resourceId}
            label={`${resource.icon ? `${resource.icon} ` : ""}${resource.label ?? readable(resource.resourceId)}`}
            value={value[resource.resourceId] ?? 0}
            bounds={{ min: resource.min, max: resource.max, step: 1 }}
            disabled={control.disabled}
            inputProps={{
              ...control.props,
              "data-resource": resource.resourceId,
            }}
            onChange={(amount) =>
              change({ ...value, [resource.resourceId]: amount ?? 0 })
            }
          />
        ))}
      </div>
    );
    if (control.mode === "single")
      return (
        <fieldset className="grid gap-2" disabled={control.disabled}>
          <legend>{label}</legend>
          {row(control.value ?? empty, control.setValue)}
        </fieldset>
      );
    return (
      <fieldset className="grid gap-2" disabled={control.disabled}>
        <legend>{label}</legend>
        {control.value.map((value, index) => (
          <fieldset className="grid gap-2" key={index}>
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
              className={`${removable} justify-self-start`}
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
          className={`${removable} justify-self-start`}
          type="button"
          disabled={control.value.length >= manyLimit(control.domain)}
          onClick={() => control.setValue([...control.value, empty])}
        >
          Add allocation
        </Button>
      </fieldset>
    );
  }
  return (
    <fieldset className="grid min-w-0 gap-2" disabled={control.disabled}>
      <legend>{label}</legend>
      <div className="flex min-w-0 flex-wrap gap-2">
        {control.options.map((option, index) => (
          <Button
            variant="outline"
            className="h-auto min-h-11 max-w-full rounded-full px-4 py-2 break-all whitespace-normal aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            key={index}
            {...option.props}
            aria-pressed={option.selected}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {control.options.length === 0 && <p>No choices available</p>}
    </fieldset>
  );
}
function manyLimit(domain: {
  selection?: { mode: string; max?: number } | undefined;
}) {
  return domain.selection?.mode === "many"
    ? (domain.selection.max ?? Infinity)
    : Infinity;
}

/** − and + around the number, which can also be typed. */
function Stepper({
  label,
  value,
  bounds: { min, max, step },
  disabled,
  inputProps,
  onChange,
}: {
  label: string;
  value: number | undefined;
  bounds: { min: number; max: number; step: number };
  disabled: boolean;
  inputProps: InputControl["props"];
  onChange(value: number | undefined): void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const changeStep = (direction: number) => {
    const field = input.current!;
    field.stepUp(direction);
    onChange(field.valueAsNumber);
  };
  return (
    <div className="db-stepper grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          className="size-11 text-lg"
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={disabled || (value ?? min) <= min}
          onClick={() => changeStep(-1)}
        >
          −
        </Button>
        <Input
          ref={input}
          id={id}
          className="min-h-11 w-16 text-center tabular-nums"
          {...inputProps}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          onChange={(event) =>
            onChange(
              event.currentTarget.value === ""
                ? undefined
                : event.currentTarget.valueAsNumber,
            )
          }
        />
        <Button
          variant="outline"
          className="size-11 text-lg"
          type="button"
          aria-label={`Increase ${label}`}
          disabled={disabled || (value !== undefined && value >= max)}
          onClick={() => (value === undefined ? onChange(min) : changeStep(1))}
        >
          +
        </Button>
      </div>
    </div>
  );
}
