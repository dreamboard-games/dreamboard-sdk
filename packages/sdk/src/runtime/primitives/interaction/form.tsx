import {
  InteractionForm,
  InteractionField as BaseInteractionField,
  type InteractionFormProps,
  type InteractionFieldProps as BaseInteractionFieldProps,
} from "../../components/InteractionForm.js";
import type {
  InteractionHandle,
  InteractionParamsShape,
} from "../../hooks/useInteractionHandle.js";
import type { InteractionDescriptor } from "../../types/plugin-state.js";
import { useInteractionPrimitiveContext } from "./context.js";

export type BoundInteractionFormProps<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
> = Omit<InteractionFormProps<Params, DefaultedKeys>, "descriptor" | "handle">;

export function castInteractionHandle<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>(handle: InteractionHandle): InteractionHandle<Params, DefaultedKeys> {
  return handle as InteractionHandle<Params, DefaultedKeys>;
}

export function castInteractionDraft<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>(
  draft: Record<string, unknown>,
): InteractionHandle<Params, DefaultedKeys>["draft"] {
  return draft as InteractionHandle<Params, DefaultedKeys>["draft"];
}

export function castInteractionFields<
  Params extends InteractionParamsShape = InteractionParamsShape,
>(fields: readonly string[]): ReadonlyArray<keyof Params & string> {
  return fields as ReadonlyArray<keyof Params & string>;
}

export function BoundInteractionForm<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>({
  descriptor,
  handle,
  ...props
}: BoundInteractionFormProps<Params, DefaultedKeys> & {
  descriptor: InteractionDescriptor;
  handle: InteractionHandle;
}) {
  return (
    <InteractionForm<Params, DefaultedKeys>
      descriptor={descriptor}
      handle={castInteractionHandle<Params, DefaultedKeys>(handle)}
      {...props}
    />
  );
}

export type InteractionFormPrimitiveProps<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
> = BoundInteractionFormProps<Params, DefaultedKeys>;

export function InteractionFormPrimitive<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>(props: InteractionFormPrimitiveProps<Params, DefaultedKeys>) {
  const { descriptor, handle } = useInteractionPrimitiveContext();
  if (!descriptor || !handle) return null;
  return (
    <BoundInteractionForm<Params, DefaultedKeys>
      descriptor={descriptor}
      handle={handle}
      {...props}
    />
  );
}

export type InteractionFieldPrimitiveProps<
  Params extends InteractionParamsShape = InteractionParamsShape,
  Input extends keyof Params & string = keyof Params & string,
> = Omit<
  BaseInteractionFieldProps<Params, Input>,
  "descriptor" | "handle" | "inputKey"
> & {
  input: Input;
};

export function InteractionFieldPrimitive<
  Params extends InteractionParamsShape = InteractionParamsShape,
  Input extends keyof Params & string = keyof Params & string,
>({ input, ...props }: InteractionFieldPrimitiveProps<Params, Input>) {
  const { descriptor, handle } = useInteractionPrimitiveContext();
  if (!descriptor || !handle) return null;
  return (
    <BaseInteractionField<Params, Input>
      descriptor={descriptor}
      handle={castInteractionHandle<Params>(handle)}
      inputKey={input}
      {...props}
    />
  );
}
