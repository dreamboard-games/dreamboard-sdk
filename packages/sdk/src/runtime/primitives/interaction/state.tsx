import type { ReactNode } from "react";
import type {
  InteractionHandle,
  InteractionParamsShape,
} from "../../hooks/useInteractionHandle.js";
import { useInteractionUiStore } from "../../context/InteractionDraftContext.js";
import type { InteractionDescriptor } from "../../types/plugin-state.js";
import { getInteractionDraftReadiness } from "../../utils/interaction-router.js";
import { castInteractionDraft, castInteractionHandle } from "./form.js";
import { useInteractionPrimitiveContext } from "./context.js";

export interface InteractionStateSnapshot<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
> {
  interaction: string;
  descriptor: InteractionDescriptor;
  handle: InteractionHandle<Params, DefaultedKeys>;
  draft: InteractionHandle<Params, DefaultedKeys>["draft"];
  values: InteractionHandle<Params, DefaultedKeys>["values"];
  status: InteractionHandle<Params, DefaultedKeys>["status"];
  available: boolean;
  isReady: boolean;
  isArmed: boolean;
  inputKeys: readonly string[];
  missingInputs: readonly string[];
  readyFrontier: readonly string[];
  blockedInputs: readonly string[];
  hasInputs: boolean;
}

export interface InteractionStateProps<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
> {
  unavailable: ReactNode;
  children: (
    state: InteractionStateSnapshot<Params, DefaultedKeys>,
  ) => ReactNode;
}

export function InteractionState<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>({ children, unavailable }: InteractionStateProps<Params, DefaultedKeys>) {
  const { interaction, descriptor, handle } = useInteractionPrimitiveContext();
  const store = useInteractionUiStore();
  if (!descriptor || !handle) {
    return <>{unavailable}</>;
  }
  const typedHandle = castInteractionHandle<Params, DefaultedKeys>(handle);
  const liveDraft = castInteractionDraft<Params, DefaultedKeys>(
    store.getDraft(descriptor.interactionKey),
  );
  const inputKeys = descriptor.inputs.map((input) => input.key);
  const readiness = getInteractionDraftReadiness(descriptor, liveDraft);
  return (
    <>
      {children({
        interaction,
        descriptor,
        handle: typedHandle,
        draft: liveDraft,
        values: typedHandle.values,
        status: typedHandle.status,
        available: typedHandle.available,
        isReady: readiness.ready,
        isArmed: typedHandle.isArmed,
        inputKeys,
        missingInputs: readiness.missingInputs,
        readyFrontier: readiness.readyFrontier,
        blockedInputs: readiness.blockedInputs,
        hasInputs: inputKeys.length > 0,
      })}
    </>
  );
}
