import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import type { InteractionParamsShape } from "../../hooks/useInteractionHandle.js";
import {
  inputByKey,
  resolveInputDomain,
} from "../../utils/interaction-inputs.js";
import { isInteractionAvailable } from "../../utils/interaction-status.js";
import {
  gameplayPreparationPatternsForDescriptor,
  gameplayScalarFillMetadata,
  gameplaySubmitMetadata,
} from "../../utils/browser-interaction-effects.js";
import {
  composeEventHandlers,
  renderPrimitive,
  type PrimitiveCommonProps,
} from "../../../ui/primitives/primitive-props.js";
import { gameplayActuatorAttributes } from "../../interactions/gameplay-attributes.js";
import {
  submitInteractionDraft,
  submitInteractionParams,
  type InteractionSubmitCallbacks,
} from "../interaction-submit.js";
import { useGameActionError } from "../game.js";
import { useInteractionPrimitiveContext } from "./context.js";

export type InteractionTriggerProps = PrimitiveCommonProps &
  ButtonHTMLAttributes<HTMLButtonElement>;

export function InteractionTrigger({
  disabled,
  onClick,
  ...props
}: InteractionTriggerProps) {
  const { descriptor, handle } = useInteractionPrimitiveContext();
  const available = isInteractionAvailable(descriptor);
  const isDisabled = disabled === true || !available;
  return renderPrimitive("button", {
    type: "button",
    ...props,
    ...(descriptor
      ? gameplayActuatorAttributes({
          descriptor,
          draftDigest: descriptor.draftDigest,
          intent: "arm",
          enabled: !isDisabled,
          actuatorKind: "click",
          actuatorId: "primitive-trigger",
          preparationPatterns: gameplayPreparationPatternsForDescriptor(
            descriptor,
            (handle?.values ?? {}) as Readonly<Record<string, unknown>>,
          ),
        })
      : {}),
    disabled: isDisabled,
    "aria-disabled": isDisabled,
    "data-dreamboard-interaction-trigger": "",
    "data-interaction-id": descriptor?.interactionId,
    "data-interaction-key": descriptor?.interactionKey,
    "data-available": available,
    "data-disabled": isDisabled || undefined,
    "data-state": handle?.isArmed ? "armed" : "idle",
    onClick: composeEventHandlers(onClick, () => {
      handle?.arm();
    }),
  });
}

export type InteractionSubmitProps = PrimitiveCommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    params?:
      | InteractionParamsShape
      | (() => InteractionParamsShape | null | undefined);
    onSubmitSuccess?: InteractionSubmitCallbacks["onSubmitSuccess"];
    onSubmitError?: InteractionSubmitCallbacks["onSubmitError"];
  };

export function InteractionSubmit({
  disabled,
  onClick,
  params,
  onSubmitSuccess,
  onSubmitError,
  ...props
}: InteractionSubmitProps) {
  const { descriptor, handle } = useInteractionPrimitiveContext();
  const gameActionError = useGameActionError();
  const isSubmitting = handle?.status === "submitting";
  const hasExplicitParams = params !== undefined;
  const submitMetadata = descriptor
    ? gameplaySubmitMetadata({ descriptor, explicitParams: hasExplicitParams })
    : null;
  const available = isInteractionAvailable(descriptor);
  const isDisabled =
    disabled === true ||
    !available ||
    (!hasExplicitParams && !handle?.isReady) ||
    isSubmitting;
  return renderPrimitive("button", {
    type: "button",
    ...props,
    ...(descriptor
      ? gameplayActuatorAttributes({
          descriptor,
          draftDigest: descriptor.draftDigest,
          intent: submitMetadata?.intent ?? "submit",
          enabled: !isDisabled,
          actuatorKind: "click",
          actuatorId: "primitive-submit",
          semanticEffects: submitMetadata?.semanticEffects,
        })
      : {}),
    disabled: isDisabled,
    "aria-disabled": isDisabled,
    "data-dreamboard-interaction-submit": "",
    "data-interaction-id": descriptor?.interactionId,
    "data-interaction-key": descriptor?.interactionKey,
    "data-available": available,
    "data-disabled": isDisabled || undefined,
    "data-ready": handle?.isReady ?? false,
    "data-has-inputs": descriptor ? descriptor.inputs.length > 0 : undefined,
    "data-input-count": descriptor?.inputs.length,
    "data-submitting": isSubmitting || undefined,
    "data-state": handle?.status ?? "unavailable",
    onClick: composeEventHandlers(onClick, () => {
      if (isDisabled || !handle) return;
      const resolvedParams = typeof params === "function" ? params() : params;
      if (resolvedParams === null || resolvedParams === undefined) {
        void submitInteractionDraft(handle, {
          onSubmitSuccess,
          onSubmitError: onSubmitError ?? gameActionError ?? undefined,
        });
        return;
      }
      void submitInteractionParams(handle, resolvedParams, {
        onSubmitSuccess,
        onSubmitError: onSubmitError ?? gameActionError ?? undefined,
      });
    }),
  });
}

export type InteractionInputProps = PrimitiveCommonProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "name"> & {
    name: string;
    parse?: (value: string) => unknown;
  };

export function InteractionInput({
  name,
  parse,
  onChange,
  disabled,
  ...props
}: InteractionInputProps) {
  const { descriptor, handle } = useInteractionPrimitiveContext();
  const value = handle?.draft[name];
  const isDisabled = disabled === true || !isInteractionAvailable(descriptor);
  const inputDescriptor = descriptor ? inputByKey(descriptor, name) : undefined;
  const resolvedInputDescriptor =
    inputDescriptor && handle
      ? resolveInputDomain(
          inputDescriptor,
          handle.values as Readonly<Record<string, unknown>>,
        )
      : undefined;
  const scalarFillMetadata =
    resolvedInputDescriptor?.domain.type === "boundedNumber"
      ? gameplayScalarFillMetadata({
          inputKey: name,
          domain: resolvedInputDescriptor.domain,
        })
      : undefined;
  return renderPrimitive("input", {
    ...props,
    name,
    ...(descriptor
      ? gameplayActuatorAttributes({
          descriptor,
          draftDigest: descriptor.draftDigest,
          inputKey: name,
          intent: "fill",
          enabled: !isDisabled,
          actuatorKind: "fill",
          actuatorId: `primitive-input:${name}`,
          acceptedEffectPatterns: scalarFillMetadata?.acceptedEffectPatterns,
        })
      : {}),
    disabled: isDisabled,
    "aria-disabled": isDisabled,
    "data-dreamboard-interaction-input": "",
    "data-input-name": name,
    "data-disabled": isDisabled || undefined,
    "data-selected": value !== undefined || undefined,
    onChange: composeEventHandlers(onChange, (event) => {
      const target = event.currentTarget;
      handle?.setInput(name, parse ? parse(target.value) : target.value);
    }),
  });
}
