import type { ActionProps } from "./model.js";
import type { InputDomain } from "../shared/protocol/frame.js";
import type { RuntimeJson } from "../shared/runtime-json.js";

type Domain<Type extends InputDomain["type"]> = Extract<
  InputDomain,
  { type: Type }
>;
type Editable<Value> = {
  readonly value: Value;
  readonly setValue: (value: Value) => void;
};
type Control<Type extends "boundedNumber" | "resourceMap", Value> = {
  readonly type: Type;
  readonly domain: Domain<Type>;
} & (
  | ({ readonly mode: "single" } & Editable<Value | undefined>)
  | ({ readonly mode: "many" } & Editable<Value[]>)
);
export interface InputTargetOption<Value = RuntimeJson> {
  readonly value: Value;
  readonly label: string;
  readonly selected: boolean;
  readonly props: ActionProps;
}
/** A captured, descriptor-driven editor. Its handlers retain the input's lifetime. */
export type InputControl = {
  readonly key: string;
  readonly disabled: boolean;
  readonly props: {
    readonly disabled: boolean;
    readonly [key: `data-${string}`]: string | number | boolean | undefined;
  };
} & (
  | Control<"boundedNumber", number>
  | Control<"resourceMap", Record<string, number>>
  | { readonly type: "targets"; readonly options: readonly InputTargetOption[] }
);

interface ControlInput {
  readonly key: string;
  getDomain(): InputDomain;
  getValue(): RuntimeJson | undefined;
  setValue(value: RuntimeJson): void;
  clear(): void;
  getTargetOptions(): readonly InputTargetOption[];
}
/** Drafts can contain incomplete edits, so normalize only the displayed field values. */
function resourceValue(
  domain: Domain<"resourceMap">,
  value: RuntimeJson | undefined,
): Record<string, number> {
  const record =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  return Object.fromEntries(
    domain.resources.map((resource) => {
      const amount = record[resource.resourceId];
      return [resource.resourceId, typeof amount === "number" ? amount : 0];
    }),
  );
}
export function createInputControl(
  input: ControlInput,
  props: InputControl["props"],
): InputControl {
  const domain = input.getDomain();
  const current = input.getValue();
  const common = { key: input.key, disabled: props.disabled, props };
  if (domain.type === "boundedNumber") {
    if (domain.selection?.mode === "many")
      return {
        ...common,
        type: "boundedNumber",
        domain,
        mode: "many",
        value: Array.isArray(current)
          ? current.filter(
              (value): value is number => typeof value === "number",
            )
          : [],
        setValue: (value) => input.setValue(value),
      };
    return {
      ...common,
      type: "boundedNumber",
      domain,
      mode: "single",
      value: typeof current === "number" ? current : undefined,
      setValue: (value) =>
        value === undefined ? input.clear() : input.setValue(value),
    };
  }
  if (domain.type === "resourceMap") {
    if (domain.selection?.mode === "many")
      return {
        ...common,
        type: "resourceMap",
        domain,
        mode: "many",
        value: Array.isArray(current)
          ? current.map((value) => resourceValue(domain, value))
          : [],
        setValue: (value) => input.setValue(value),
      };
    return {
      ...common,
      type: "resourceMap",
      domain,
      mode: "single",
      value: current === undefined ? undefined : resourceValue(domain, current),
      setValue: (value) =>
        value === undefined ? input.clear() : input.setValue(value),
    };
  }
  return { ...common, type: "targets", options: input.getTargetOptions() };
}
