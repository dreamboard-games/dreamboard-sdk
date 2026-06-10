import {
  InteractionForm,
  type InteractionFormProps,
} from "../components/InteractionForm.js";
import type {
  InteractionHandle,
  InteractionParamsShape,
} from "../hooks/useInteractionHandle.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";

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
