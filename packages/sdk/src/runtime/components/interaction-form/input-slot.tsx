/**
 * Headless input-slot factory for the interaction form: the slot prop types
 * and `createInteractionInputSlot`, which builds the
 * `Field`/`Default`/`Target`/`Card`/`Cards`/`Options`/`Value`/`Label`/`Message`
 * render surface (plus its shared `targetButton` helper) for a single input.
 *
 * Moved verbatim from `../InteractionForm.tsx`.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { gameplayActuatorAttributes } from "../../interactions/gameplay-attributes.js";
import type {
  InteractionHandle,
  InteractionParamsShape,
} from "../../hooks/useInteractionHandle.js";
import type {
  InteractionDescriptor,
  InteractionInputDescriptor,
} from "../../types/plugin-state.js";
import {
  inputTargetKind,
  isResolvedTargetDomain,
  isTargetDomain,
  resolveInputDomain,
  toggleManyValue,
} from "../../utils/interaction-inputs.js";
import { interactionDraftDigestForValues } from "../../utils/interaction-draft-digest.js";
import { gameplayCandidateMetadata } from "../../utils/browser-interaction-effects.js";
import { DefaultInteractionField, labelForInput } from "./fields.js";

export interface InteractionSlotComponentProps {
  children?: ReactNode;
}

export type InteractionButtonSlotProps = InteractionSlotComponentProps &
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "disabled" | "type" | "value"
  >;

export interface InteractionTargetSlotProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | "children"
  | "disabled"
  | "aria-disabled"
  | "aria-pressed"
  | "onClick"
  | "type"
  | "value"
> {
  value: string;
  children?: ReactNode;
}

export interface InteractionOptionsSlotProps {
  children: (option: { value: string | null; label: string }) => ReactNode;
}

export interface InteractionCardsSlotProps {
  children: (card: { id: string }) => ReactNode;
}

export interface InteractionValueSlotProps {
  children: (value: unknown) => ReactNode;
}

export interface InteractionInputSlot {
  Field: (props: InteractionSlotComponentProps) => ReactNode;
  Default: (props: InteractionSlotComponentProps) => ReactNode;
  Target: (props: InteractionTargetSlotProps) => ReactNode;
  Card: (props: InteractionTargetSlotProps) => ReactNode;
  Cards: (props: InteractionCardsSlotProps) => ReactNode;
  Options: (props: InteractionOptionsSlotProps) => ReactNode;
  Value: (props: InteractionValueSlotProps) => ReactNode;
  Label: (props: InteractionSlotComponentProps) => ReactNode;
  Message: (props: InteractionSlotComponentProps) => ReactNode;
}

export type InteractionInputRenderMap = Record<
  string,
  (slot: InteractionInputSlot) => ReactNode
>;

export interface InteractionSubmitSlot {
  Button: (props: InteractionButtonSlotProps) => ReactNode;
}

export function createInteractionInputSlot<
  Params extends InteractionParamsShape,
  Key extends keyof Params & string,
>({
  descriptor,
  input,
  handle,
  errors,
  missing,
  disabled,
}: {
  descriptor: InteractionDescriptor;
  input: InteractionInputDescriptor & { key: Key };
  handle: InteractionHandle<Params>;
  errors: readonly string[];
  missing: boolean;
  disabled: boolean;
}): InteractionInputSlot {
  const value = handle.values[input.key] as Params[Key] | undefined;
  const resolvedInput = resolveInputDomain(
    input,
    handle.values as Readonly<Record<string, unknown>>,
  ) as InteractionInputDescriptor & { key: Key };

  const targetButton = ({
    value: targetValue,
    children,
    kind,
    ...buttonProps
  }: InteractionTargetSlotProps & { kind: "card" | "target" }) => {
    const domain = resolvedInput.domain;
    const eligible =
      isResolvedTargetDomain(domain) &&
      domain.eligibleTargets.includes(targetValue);
    const selection = isTargetDomain(domain) ? domain.selection : undefined;
    const currentValue = handle.values[input.key];
    const selected =
      selection?.mode === "many"
        ? Array.isArray(currentValue) &&
          currentValue.map(String).includes(targetValue)
        : currentValue !== undefined && String(currentValue) === targetValue;
    const isDisabled = disabled || !eligible;
    const dataAttribute =
      kind === "card"
        ? { "data-dreamboard-interaction-card-slot": "" }
        : { "data-dreamboard-interaction-target-slot": "" };
    const browserAttributes = gameplayActuatorAttributes({
      descriptor,
      draftDigest: interactionDraftDigestForValues(
        descriptor,
        handle.values as Readonly<Record<string, unknown>>,
      ),
      inputKey: input.key,
      intent: selection?.mode === "many" ? "toggle" : "select",
      candidateValue: targetValue,
      candidateState: selected ? "selected" : "unselected",
      enabled: !isDisabled,
      actuatorKind: "click",
      actuatorId: `${kind}:${input.key}:${targetValue}`,
      semanticEffects: gameplayCandidateMetadata({
        descriptor,
        draftValues: handle.values as Readonly<Record<string, unknown>>,
        inputKey: input.key,
        candidateValue: targetValue,
        intent: selection?.mode === "many" ? "toggle" : "select",
      }).semanticEffects,
    });
    return (
      <button
        type="button"
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-pressed={selected}
        data-input-name={input.key}
        data-target-kind={inputTargetKind(domain)}
        data-target-value={targetValue}
        data-eligible={eligible}
        data-selected={selected || undefined}
        data-disabled={isDisabled || undefined}
        {...dataAttribute}
        {...browserAttributes}
        {...buttonProps}
        onClick={() => {
          if (isDisabled) return;
          const nextValue =
            selection?.mode === "many"
              ? toggleManyValue(currentValue, targetValue, selection)
              : targetValue;
          handle.setInput(input.key, nextValue as Params[Key]);
        }}
      >
        {children ?? targetValue}
      </button>
    );
  };

  return {
    Field: () => (
      <DefaultInteractionField
        descriptor={descriptor}
        input={resolvedInput}
        handle={handle}
        value={value}
        setValue={(next) => handle.setInput(input.key, next)}
        clearValue={() => handle.clearInput(input.key)}
        errors={errors}
        missing={missing}
        disabled={disabled}
      />
    ),
    Default: ({ children }) => {
      const hasDefault = "defaultValue" in input;
      const isDisabled = disabled || !hasDefault;
      const browserAttributes = gameplayActuatorAttributes({
        descriptor,
        draftDigest: interactionDraftDigestForValues(
          descriptor,
          handle.values as Readonly<Record<string, unknown>>,
        ),
        inputKey: input.key,
        intent: "select",
        candidateValue: input.defaultValue,
        candidateState: "unselected",
        enabled: !isDisabled,
        actuatorKind: "click",
        actuatorId: `default:${input.key}`,
        semanticEffects: hasDefault
          ? gameplayCandidateMetadata({
              descriptor,
              draftValues: handle.values as Readonly<Record<string, unknown>>,
              inputKey: input.key,
              candidateValue: input.defaultValue,
              intent: "select",
            }).semanticEffects
          : undefined,
      });
      return (
        <button
          type="button"
          disabled={isDisabled}
          aria-disabled={isDisabled}
          data-dreamboard-interaction-default-slot=""
          data-input-name={input.key}
          data-disabled={isDisabled || undefined}
          {...browserAttributes}
          onClick={() => {
            if (isDisabled) return;
            handle.setInput(input.key, input.defaultValue as Params[Key]);
          }}
        >
          {children ?? "Use default"}
        </button>
      );
    },
    Target: (props) => targetButton({ ...props, kind: "target" }),
    Card: (props) => targetButton({ ...props, kind: "card" }),
    Cards: ({ children }) => {
      const domain = resolvedInput.domain;
      const targets = isResolvedTargetDomain(domain)
        ? domain.eligibleTargets
        : [];
      return <>{targets.map((id) => children({ id }))}</>;
    },
    Options: ({ children }) => {
      const domain = resolvedInput.domain;
      const choices =
        domain.type === "choice" || domain.type === "choiceList"
          ? (domain.choices ?? [])
          : [];
      return <>{choices.map((choice) => children(choice))}</>;
    },
    Value: ({ children }) => <>{children(value)}</>,
    Label: ({ children }) => <>{children ?? labelForInput(resolvedInput)}</>,
    Message: ({ children }) => {
      const message = children ?? errors[0] ?? (missing ? "Required" : null);
      return message ? (
        <span role="alert" data-dreamboard-interaction-message-slot="">
          {message}
        </span>
      ) : null;
    },
  };
}
