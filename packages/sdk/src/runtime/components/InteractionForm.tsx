import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  surfaceStyle,
  useTheme,
  useThemeCssVars,
} from "../../ui.js";
import {
  createGameplayActuatorAttributes,
  createGameplayInteractionRootAttributes,
  type GameplayActuatorAttributesInput,
  type BrowserInteractionAttributeMap,
  type BrowserInteractionCandidateState,
  type GameplayBrowserInteractionIntent,
} from "../../browser-interaction/index.js";
import type {
  DraftValidation,
  InteractionHandle,
  InteractionParamsShape,
} from "../hooks/useInteractionHandle.js";
import type {
  InteractionChoiceOption,
  InteractionDescriptor,
  InteractionInputDescriptor,
  InputDomain,
} from "../types/plugin-state.js";
import { interactionLabel } from "../utils/interaction-labels.js";
import {
  inputTargetKind,
  isResolvedTargetDomain,
  isTargetDomain,
  resolveInputDomain,
  resolveInteractionInputs,
  toggleManyValue,
} from "../utils/interaction-inputs.js";
import { interactionDraftDigestForValues } from "../utils/interaction-draft-digest.js";
import { isInteractionAvailable } from "../utils/interaction-status.js";
import {
  gameplayCandidateMetadata,
  gameplayPreparationPatternsForDescriptor,
  gameplayResourceMetadata,
  gameplayScalarFillMetadata,
  gameplayScalarStepMetadata,
  gameplaySubmitMetadata,
} from "../utils/browser-interaction-effects.js";
import { useChromeSuppression, ThemedButton } from "../../ui.js";

export interface InteractionFieldRenderProps<
  Params extends InteractionParamsShape = InteractionParamsShape,
  Key extends keyof Params & string = keyof Params & string,
> {
  descriptor: InteractionDescriptor;
  input: InteractionInputDescriptor & { key: Key };
  handle: InteractionHandle<Params>;
  value: Params[Key] | undefined;
  setValue: (value: Params[Key]) => void;
  clearValue: () => void;
  errors: readonly string[];
  missing: boolean;
  disabled: boolean;
}

export type InteractionFieldRenderMap<
  Params extends InteractionParamsShape = InteractionParamsShape,
> = Partial<{
  [K in keyof Params & string]: (
    props: InteractionFieldRenderProps<Params, K>,
  ) => ReactNode;
}>;

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

export interface InteractionFieldProps<
  Params extends InteractionParamsShape = InteractionParamsShape,
  Key extends keyof Params & string = keyof Params & string,
> {
  descriptor: InteractionDescriptor;
  inputKey: Key;
  handle: InteractionHandle<Params>;
  errors?: readonly string[];
  missing?: boolean;
  disabled?: boolean;
  render?: InteractionFieldRenderMap<Params>[Key];
}

export interface InteractionFormProps<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
> {
  descriptor: InteractionDescriptor;
  handle: InteractionHandle<Params, DefaultedKeys>;
  fields?: ReadonlyArray<keyof Params & string>;
  hiddenFields?: ReadonlyArray<keyof Params & string>;
  renderFields?: InteractionFieldRenderMap<Params>;
  inputs?: InteractionInputRenderMap;
  submit?: (
    slot: InteractionSubmitSlot,
    descriptor: InteractionDescriptor,
  ) => ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  submitLabel?: ReactNode;
  cancelLabel?: ReactNode;
  onCancel?: () => void;
  onSubmitSuccess?: () => void;
  disabled?: boolean;
  accordion?: boolean;
  defaultOpen?: boolean;
  style?: CSSProperties;
}

const EMPTY_FIELD_ERRORS: readonly string[] = [];
const GAMEPLAY_BROWSER_SCOPE_ID = "runtime";

function gameplayInteractionRootAttributes({
  descriptor,
  draftValues,
  ready,
  available,
}: {
  descriptor: InteractionDescriptor;
  draftValues?: Readonly<Record<string, unknown>>;
  ready: boolean;
  available: boolean;
}): BrowserInteractionAttributeMap {
  return createGameplayInteractionRootAttributes({
    scopeId: GAMEPLAY_BROWSER_SCOPE_ID,
    interactionKey: descriptor.interactionKey,
    interactionId: descriptor.interactionId,
    ...(descriptor.descriptorDigest !== undefined
      ? { descriptorDigest: descriptor.descriptorDigest }
      : {}),
    ...(descriptor.draftDigest !== undefined
      ? {
          draftDigest: interactionDraftDigestForValues(
            descriptor,
            draftValues ?? {},
          ),
        }
      : {}),
    readiness: available ? (ready ? "ready" : "blocked") : "unavailable",
  });
}

function gameplayActuatorAttributes({
  descriptor,
  inputKey,
  intent,
  candidateValue,
  candidateState,
  semanticEffects,
  acceptedEffectPatterns,
  preparationPatterns,
  draftValues,
  enabled,
  actuatorKind,
  actuatorId,
}: {
  descriptor: InteractionDescriptor;
  inputKey?: string;
  intent: GameplayBrowserInteractionIntent;
  candidateValue?: unknown;
  candidateState?: BrowserInteractionCandidateState;
  semanticEffects?: GameplayActuatorAttributesInput["semanticEffects"];
  acceptedEffectPatterns?: GameplayActuatorAttributesInput["acceptedEffectPatterns"];
  preparationPatterns?: GameplayActuatorAttributesInput["preparationPatterns"];
  draftValues?: Readonly<Record<string, unknown>>;
  enabled: boolean;
  actuatorKind: GameplayActuatorAttributesInput["actuatorKind"];
  actuatorId: string;
}): BrowserInteractionAttributeMap {
  return createGameplayActuatorAttributes({
    scopeId: GAMEPLAY_BROWSER_SCOPE_ID,
    interactionKey: descriptor.interactionKey,
    interactionId: descriptor.interactionId,
    intent,
    enabled,
    actuatorKind,
    actuatorId,
    ...(descriptor.descriptorDigest !== undefined
      ? { descriptorDigest: descriptor.descriptorDigest }
      : {}),
    ...(descriptor.draftDigest !== undefined
      ? {
          draftDigest: interactionDraftDigestForValues(
            descriptor,
            draftValues ?? {},
          ),
        }
      : {}),
    ...(inputKey !== undefined ? { inputKey } : {}),
    ...(candidateValue !== undefined ? { candidateValue } : {}),
    ...(candidateState !== undefined ? { candidateState } : {}),
    ...(semanticEffects !== undefined ? { semanticEffects } : {}),
    ...(acceptedEffectPatterns !== undefined ? { acceptedEffectPatterns } : {}),
    ...(preparationPatterns !== undefined ? { preparationPatterns } : {}),
  });
}

export function InteractionForm<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>({
  descriptor,
  handle,
  fields,
  hiddenFields,
  renderFields,
  inputs,
  submit: renderSubmit,
  title,
  description,
  submitLabel,
  cancelLabel = "Cancel",
  onCancel,
  onSubmitSuccess,
  disabled = false,
  accordion = true,
  defaultOpen = false,
  style,
}: InteractionFormProps<Params, DefaultedKeys>) {
  const theme = useTheme();
  const fallbackLabel = interactionLabel(descriptor);
  const formId = useId();
  useChromeSuppression(formId, true);
  const [pending, setPending] = useState(false);
  const [validation, setValidation] = useState<DraftValidation<Params> | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [accordionOpen, setAccordionOpen] = useState(defaultOpen);
  const hidden = useMemo(() => new Set(hiddenFields ?? []), [hiddenFields]);
  const visibleInputs = useMemo(() => {
    if (inputs) {
      const rendered = new Set(Object.keys(inputs));
      return resolveInteractionInputs(
        descriptor,
        handle.values as Readonly<Record<string, unknown>>,
      ).filter((input) => rendered.has(input.key));
    }
    const allowed = fields ? new Set(fields) : null;
    return defaultFormInputs(
      descriptor,
      handle.values as Readonly<Record<string, unknown>>,
    ).filter((input) => {
      const key = input.key as keyof Params & string;
      if (allowed && !allowed.has(key)) return false;
      return !hidden.has(key);
    });
  }, [descriptor, fields, hidden, handle.values, inputs]);

  const currentValidation = validation;
  const fieldErrors = (currentValidation?.fieldErrors ?? {}) as Partial<
    Record<keyof Params & string, readonly string[]>
  >;
  const missing = new Set<string>(currentValidation?.missing ?? []);
  const formErrors = [
    ...(currentValidation?.formErrors ?? []),
    ...(formError ? [formError] : []),
  ];
  const isDisabled = disabled || pending || !isInteractionAvailable(descriptor);
  const useAccordion = accordion && visibleInputs.length > 0;
  const rootBrowserAttributes = gameplayInteractionRootAttributes({
    descriptor,
    draftValues: handle.values as Readonly<Record<string, unknown>>,
    ready: handle.isReady,
    available: !isDisabled,
  });
  const armBrowserAttributes = gameplayActuatorAttributes({
    descriptor,
    draftValues: handle.values as Readonly<Record<string, unknown>>,
    intent: "arm",
    enabled: !isDisabled,
    actuatorKind: "click",
    actuatorId: "arm",
    preparationPatterns: gameplayPreparationPatternsForDescriptor(
      descriptor,
      handle.values as Readonly<Record<string, unknown>>,
    ),
  });
  const submitMetadata = gameplaySubmitMetadata({ descriptor });
  const submitBrowserAttributes = gameplayActuatorAttributes({
    descriptor,
    draftValues: handle.values as Readonly<Record<string, unknown>>,
    intent: submitMetadata.intent,
    enabled: !isDisabled && handle.isReady,
    actuatorKind: "click",
    actuatorId: "submit",
    semanticEffects: submitMetadata.semanticEffects,
  });

  useEffect(() => {
    setAccordionOpen(defaultOpen);
  }, [defaultOpen, descriptor.interactionId]);

  const containerStyle: CSSProperties = {
    ...surfaceStyle(theme, { tone: "card" }),
    display: "flex",
    flexDirection: "column",
    gap: theme.space[2],
    padding: theme.space[3],
    minWidth: "min(100%, 280px)",
    boxSizing: "border-box",
    fontFamily: theme.typography.fontFamily.body,
    ...style,
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isDisabled) return;
    const nextValidation = handle.validateDraft();
    setValidation(nextValidation);
    setFormError(null);
    if (!nextValidation.ok) {
      setAccordionOpen(true);
      return;
    }
    setPending(true);
    try {
      await handle.submitDraft();
      onSubmitSuccess?.();
      setAccordionOpen(defaultOpen);
    } catch (error) {
      setAccordionOpen(true);
      setFormError(
        error instanceof Error
          ? error.message
          : "Interaction submission failed",
      );
    } finally {
      setPending(false);
    }
  };

  const header = (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <strong
        style={{
          fontFamily: theme.typography.fontFamily.display,
          fontSize: theme.typography.fontSize.md,
          color: theme.semantic.text.primary,
        }}
      >
        {title ?? fallbackLabel}
      </strong>
      {description ? (
        <span
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.semantic.text.muted,
          }}
        >
          {description}
        </span>
      ) : null}
    </div>
  );

  const fieldsContent =
    visibleInputs.length > 0 ? (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.space[3],
        }}
      >
        {visibleInputs.map((input) => {
          const key = input.key as keyof Params & string;
          const inputRenderer = inputs?.[key];
          return (
            <InteractionField<Params>
              key={input.key}
              descriptor={descriptor}
              inputKey={key}
              handle={handle}
              errors={fieldErrors[key] ?? []}
              missing={missing.has(key)}
              disabled={isDisabled}
              render={
                inputRenderer
                  ? ({ input, errors, missing, disabled }) =>
                      inputRenderer(
                        createInteractionInputSlot({
                          descriptor,
                          input,
                          handle,
                          errors,
                          missing,
                          disabled,
                        }),
                      )
                  : renderFields?.[key]
              }
            />
          );
        })}
      </div>
    ) : null;

  if (visibleInputs.length === 0 && !handle.isReady) {
    throw new Error(
      `InteractionForm '${descriptor.interactionKey}' has required inputs that cannot be rendered by the default form. Provide renderFields, select on a surface, or use a default-renderable input domain.`,
    );
  }

  const formErrorContent =
    formErrors.length > 0 ? (
      <div
        role="alert"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.space[1],
          color: theme.semantic.intent.danger.solid,
          fontSize: theme.typography.fontSize.sm,
        }}
      >
        {formErrors.map((error) => (
          <span key={error}>{error}</span>
        ))}
      </div>
    ) : null;

  const actions = (
    <div
      style={{
        display: "flex",
        gap: theme.space[2],
        justifyContent: "flex-end",
      }}
    >
      {onCancel ? (
        <ThemedButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={onCancel}
          className="h-9 px-3 text-sm"
        >
          {cancelLabel}
        </ThemedButton>
      ) : null}
      {renderSubmit ? (
        renderSubmit(
          {
            Button: ({ children, ...buttonProps }) => (
              <ThemedButton
                type="submit"
                variant="primary"
                size="sm"
                disabled={isDisabled}
                className="h-9 px-3 text-sm"
                {...submitBrowserAttributes}
                {...buttonProps}
              >
                {pending
                  ? "Submitting..."
                  : (children ?? submitLabel ?? fallbackLabel)}
              </ThemedButton>
            ),
          },
          descriptor,
        )
      ) : (
        <ThemedButton
          type="submit"
          variant="primary"
          size="sm"
          disabled={isDisabled}
          className="h-9 px-3 text-sm"
          {...submitBrowserAttributes}
        >
          {pending ? "Submitting..." : (submitLabel ?? fallbackLabel)}
        </ThemedButton>
      )}
    </div>
  );

  const body = (
    <>
      {fieldsContent}
      {formErrorContent}
      {actions}
    </>
  );

  return (
    <form
      data-interaction-form
      data-interaction-id={descriptor.interactionId}
      onSubmit={(event) => void submit(event)}
      style={containerStyle}
      {...rootBrowserAttributes}
    >
      {useAccordion ? (
        <AccordionPrimitive.Root
          type="single"
          collapsible
          value={accordionOpen ? "fields" : undefined}
          onValueChange={(value: string) =>
            setAccordionOpen(value === "fields")
          }
        >
          <AccordionPrimitive.Item value="fields">
            <AccordionPrimitive.Header style={{ margin: 0 }}>
              <AccordionPrimitive.Trigger
                {...armBrowserAttributes}
                style={{
                  alignItems: "center",
                  appearance: "none",
                  background: "transparent",
                  border: 0,
                  color: theme.semantic.text.primary,
                  cursor: "pointer",
                  display: "flex",
                  fontFamily: theme.typography.fontFamily.display,
                  fontSize: theme.typography.fontSize.md,
                  fontWeight: theme.typography.fontWeight.bold,
                  justifyContent: "space-between",
                  padding: 0,
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <span>{title ?? fallbackLabel}</span>
                <span aria-hidden>{accordionOpen ? "−" : "+"}</span>
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>
            <AccordionPrimitive.Content>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: theme.space[2],
                  marginTop: theme.space[2],
                }}
              >
                {description ? (
                  <span
                    style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.semantic.text.muted,
                    }}
                  >
                    {description}
                  </span>
                ) : null}
                {body}
              </div>
            </AccordionPrimitive.Content>
          </AccordionPrimitive.Item>
        </AccordionPrimitive.Root>
      ) : (
        <>
          {header}
          {body}
        </>
      )}
    </form>
  );
}

function createInteractionInputSlot<
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
      draftValues: handle.values as Readonly<Record<string, unknown>>,
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
        draftValues: handle.values as Readonly<Record<string, unknown>>,
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

export function InteractionField<
  Params extends InteractionParamsShape = InteractionParamsShape,
  Key extends keyof Params & string = keyof Params & string,
>({
  descriptor,
  inputKey,
  handle,
  errors = EMPTY_FIELD_ERRORS,
  missing = false,
  disabled = false,
  render,
}: InteractionFieldProps<Params, Key>) {
  const input = descriptor.inputs.find(
    (candidate) => candidate.key === inputKey,
  );
  if (!input) return null;
  const typedInput = resolveInputDomain(
    input,
    handle.values as Readonly<Record<string, unknown>>,
  ) as InteractionInputDescriptor & { key: Key };
  const value = handle.values[inputKey] as Params[Key] | undefined;
  const props: InteractionFieldRenderProps<Params, Key> = {
    descriptor,
    input: typedInput,
    handle,
    value,
    setValue: (next) => handle.setInput(inputKey, next),
    clearValue: () => handle.clearInput(inputKey),
    errors,
    missing,
    disabled,
  };
  if (render) return <>{render(props)}</>;
  return <DefaultInteractionField {...props} />;
}

export function hasDefaultInteractionFormFields(
  descriptor: Pick<InteractionDescriptor, "inputs">,
): boolean {
  return defaultFormInputs(descriptor).length > 0;
}

export function defaultFormInputs(
  descriptor: Pick<InteractionDescriptor, "inputs">,
  values: Readonly<Record<string, unknown>> = {},
): InteractionInputDescriptor[] {
  return resolveInteractionInputs(descriptor, values).filter((input) => {
    switch (input.domain.type) {
      case "choice":
      case "choiceList":
      case "resourceMap":
      case "boundedNumber":
        return true;
      case "cardTarget":
      case "boardTarget":
        return input.domain.selection?.mode === "many";
    }
  });
}

function DefaultInteractionField<
  Params extends InteractionParamsShape,
  Key extends keyof Params & string,
>(props: InteractionFieldRenderProps<Params, Key>) {
  const { input } = props;
  switch (input.domain.type) {
    case "choice":
      if (input.domain.selection?.mode === "many") {
        return (
          <ChoiceListField
            {...props}
            domain={{
              type: "choiceList",
              choices: input.domain.choices,
              min: input.domain.selection.min ?? 0,
              max: input.domain.selection.max,
              selection: input.domain.selection,
            }}
          />
        );
      }
      return <ChoiceField {...props} domain={input.domain} />;
    case "choiceList":
      return <ChoiceListField {...props} domain={input.domain} />;
    case "resourceMap":
      return <ResourceMapField {...props} domain={input.domain} />;
    case "boundedNumber":
      return <BoundedNumberField {...props} domain={input.domain} />;
    case "cardTarget":
    case "boardTarget":
      return <TargetSummaryField {...props} domain={input.domain} />;
  }
}

function FieldFrame({
  label,
  controlId,
  errors,
  missing,
  children,
}: {
  label: ReactNode;
  controlId?: string;
  errors: readonly string[];
  missing: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  const messages = errors.length > 0 ? errors : missing ? ["Required"] : [];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.space[1],
        fontSize: theme.typography.fontSize.sm,
        color: theme.semantic.text.primary,
      }}
    >
      <Label
        htmlFor={controlId}
        style={{
          color: theme.semantic.text.primary,
          fontWeight: theme.typography.fontWeight.bold,
        }}
      >
        {label}
      </Label>
      {children}
      {messages.length > 0 ? (
        <span
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            color: theme.semantic.intent.danger.solid,
            fontSize: theme.typography.fontSize.xs,
          }}
        >
          {messages.map((message) => (
            <span key={message}>{message}</span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function ChoiceOptionLabel({ choice }: { choice: InteractionChoiceOption }) {
  const theme = useTheme();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
        }}
      >
        {choice.icon ? (
          <span aria-hidden style={{ fontSize: "1.1em", lineHeight: 1 }}>
            {choice.icon}
          </span>
        ) : null}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {choice.label}
        </span>
      </span>
      {choice.badge ? (
        <span
          style={{
            borderRadius: 999,
            background: theme.semantic.surface.inset,
            color: theme.semantic.text.muted,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.bold,
            lineHeight: 1,
            padding: "3px 6px",
            whiteSpace: "nowrap",
          }}
        >
          {choice.badge}
        </span>
      ) : null}
    </span>
  );
}

function ChoiceDescription({ choice }: { choice?: InteractionChoiceOption }) {
  const theme = useTheme();
  const message = choice?.disabledReason ?? choice?.description;
  if (!message) return null;
  return (
    <span
      style={{
        color: choice?.disabledReason
          ? theme.semantic.intent.danger.solid
          : theme.semantic.text.muted,
        fontSize: theme.typography.fontSize.xs,
      }}
    >
      {message}
    </span>
  );
}

const NULL_CHOICE_SELECT_VALUE = "__dreamboard_null_choice__";

function choiceRenderKey(choice: InteractionChoiceOption): string {
  return choice.value === null ? NULL_CHOICE_SELECT_VALUE : choice.value;
}

function encodeChoiceSelectValue(value: unknown): string | undefined {
  if (value === null) return NULL_CHOICE_SELECT_VALUE;
  return typeof value === "string" ? value : undefined;
}

function decodeChoiceSelectValue(value: string): string | null {
  return value === NULL_CHOICE_SELECT_VALUE ? null : value;
}

function ChoiceField<
  Params extends InteractionParamsShape,
  Key extends keyof Params & string,
>({
  descriptor,
  handle,
  input,
  value,
  setValue,
  errors,
  missing,
  disabled,
  domain,
}: InteractionFieldRenderProps<Params, Key> & {
  domain: Extract<InputDomain, { type: "choice" }>;
}) {
  const theme = useTheme();
  const themeCssVars = useThemeCssVars();
  const choices = domain.choices ?? [];
  const controlId = useId();
  const selectedChoice =
    typeof value === "string" || value === null
      ? choices.find((choice) => choice.value === value)
      : undefined;
  if (choices.length > 0 && choices.length <= 3) {
    return (
      <FieldFrame
        label={labelForInput(input)}
        errors={errors}
        missing={missing}
      >
        <span
          style={{
            display: "inline-flex",
            flexWrap: "wrap",
            gap: theme.space[1],
          }}
        >
          {choices.map((choice) => {
            const selected = value === choice.value;
            const isDisabled = disabled || choice.disabled;
            return (
              <ThemedButton
                key={choiceRenderKey(choice)}
                type="button"
                variant={selected ? "primary" : "secondary"}
                size="sm"
                disabled={isDisabled}
                aria-pressed={selected}
                title={choice.disabledReason ?? choice.description}
                {...gameplayActuatorAttributes({
                  descriptor,
                  draftValues: handle.values as Readonly<
                    Record<string, unknown>
                  >,
                  inputKey: input.key,
                  intent: "select",
                  candidateValue: choice.value,
                  candidateState: selected ? "selected" : "unselected",
                  enabled: !isDisabled,
                  actuatorKind: "click",
                  actuatorId: `choice:${input.key}:${choiceRenderKey(choice)}`,
                  semanticEffects: gameplayCandidateMetadata({
                    descriptor,
                    draftValues: handle.values as Readonly<
                      Record<string, unknown>
                    >,
                    inputKey: input.key,
                    candidateValue: choice.value,
                    intent: "select",
                  }).semanticEffects,
                })}
                onClick={() => setValue(choice.value as Params[Key])}
                className="h-8 px-3 text-sm"
              >
                <ChoiceOptionLabel choice={choice} />
              </ThemedButton>
            );
          })}
        </span>
      </FieldFrame>
    );
  }
  return (
    <FieldFrame
      label={labelForInput(input)}
      controlId={controlId}
      errors={errors}
      missing={missing}
    >
      <Select
        disabled={disabled}
        value={encodeChoiceSelectValue(value)}
        onValueChange={(next: string) =>
          setValue(decodeChoiceSelectValue(next) as Params[Key])
        }
      >
        <SelectTrigger
          id={controlId}
          size="sm"
          className="w-full bg-white"
          {...gameplayActuatorAttributes({
            descriptor,
            draftValues: handle.values as Readonly<Record<string, unknown>>,
            inputKey: input.key,
            intent: "reveal",
            enabled: !disabled,
            actuatorKind: "click",
            actuatorId: `choice-reveal:${input.key}`,
            preparationPatterns: gameplayPreparationPatternsForDescriptor(
              { inputs: [input] },
              handle.values as Readonly<Record<string, unknown>>,
            ),
          })}
        >
          <span data-slot="select-value">
            {selectedChoice ? (
              <ChoiceOptionLabel choice={selectedChoice} />
            ) : (
              <span style={{ color: theme.semantic.text.muted }}>
                Choose...
              </span>
            )}
          </span>
        </SelectTrigger>
        <SelectContent
          style={{
            ...themeCssVars,
            fontFamily: theme.typography.fontFamily.body,
          }}
        >
          {choices.map((choice) => (
            <SelectItem
              key={choiceRenderKey(choice)}
              value={choiceRenderKey(choice)}
              textValue={choice.label}
              disabled={choice.disabled}
              {...gameplayActuatorAttributes({
                descriptor,
                draftValues: handle.values as Readonly<Record<string, unknown>>,
                inputKey: input.key,
                intent: "select",
                candidateValue: choice.value,
                candidateState:
                  value === choice.value ? "selected" : "unselected",
                enabled: !disabled && !choice.disabled,
                actuatorKind: "click",
                actuatorId: `choice:${input.key}:${choiceRenderKey(choice)}`,
                semanticEffects: gameplayCandidateMetadata({
                  descriptor,
                  draftValues: handle.values as Readonly<
                    Record<string, unknown>
                  >,
                  inputKey: input.key,
                  candidateValue: choice.value,
                  intent: "select",
                }).semanticEffects,
              })}
            >
              <ChoiceOptionLabel choice={choice} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ChoiceDescription choice={selectedChoice} />
    </FieldFrame>
  );
}

function ChoiceListField<
  Params extends InteractionParamsShape,
  Key extends keyof Params & string,
>({
  descriptor,
  handle,
  input,
  value,
  setValue,
  errors,
  missing,
  disabled,
  domain,
}: InteractionFieldRenderProps<Params, Key> & {
  domain: Extract<InputDomain, { type: "choiceList" }>;
}) {
  const theme = useTheme();
  const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
  const min =
    domain.selection?.mode === "many"
      ? (domain.selection.min ?? 0)
      : domain.min;
  const max =
    (domain.selection?.mode === "many" ? domain.selection.max : domain.max) ??
    domain.choices?.length ??
    Number.POSITIVE_INFINITY;
  const toggle = (choice: string) => {
    const next = new Set(selected);
    if (next.has(choice)) next.delete(choice);
    else if (next.size < max) next.add(choice);
    setValue([...next] as Params[Key]);
  };
  const meta =
    min || Number.isFinite(max)
      ? `Pick ${min ?? 0}${Number.isFinite(max) ? `-${max}` : "+"}`
      : undefined;
  return (
    <FieldFrame
      label={
        <span
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: theme.space[2],
          }}
        >
          <span>{labelForInput(input)}</span>
          {meta ? (
            <span style={{ color: theme.semantic.text.muted }}>{meta}</span>
          ) : null}
        </span>
      }
      errors={errors}
      missing={missing}
    >
      <span style={{ display: "flex", flexWrap: "wrap", gap: theme.space[1] }}>
        {(domain.choices ?? []).map((choice) => {
          const value = choice.value as string;
          const checked = selected.has(value);
          const isDisabled =
            disabled || choice.disabled || (!checked && selected.size >= max);
          return (
            <ThemedButton
              key={value}
              type="button"
              variant={checked ? "primary" : "secondary"}
              size="sm"
              disabled={isDisabled}
              aria-pressed={checked}
              title={choice.disabledReason ?? choice.description}
              {...gameplayActuatorAttributes({
                descriptor,
                draftValues: handle.values as Readonly<Record<string, unknown>>,
                inputKey: input.key,
                intent: "toggle",
                candidateValue: value,
                candidateState: checked ? "selected" : "unselected",
                enabled: !isDisabled,
                actuatorKind: "click",
                actuatorId: `choice-list:${input.key}:${value}`,
                semanticEffects: gameplayCandidateMetadata({
                  descriptor,
                  draftValues: handle.values as Readonly<
                    Record<string, unknown>
                  >,
                  inputKey: input.key,
                  candidateValue: value,
                  intent: "toggle",
                }).semanticEffects,
              })}
              onClick={() => toggle(value)}
              className="h-8 px-3 text-sm"
            >
              <ChoiceOptionLabel choice={choice} />
            </ThemedButton>
          );
        })}
      </span>
    </FieldFrame>
  );
}

function ResourceMapField<
  Params extends InteractionParamsShape,
  Key extends keyof Params & string,
>({
  descriptor,
  handle,
  input,
  value,
  setValue,
  errors,
  missing,
  disabled,
  domain,
}: InteractionFieldRenderProps<Params, Key> & {
  domain: Extract<InputDomain, { type: "resourceMap" }>;
}) {
  const theme = useTheme();
  const current: Record<string, unknown> = isRecord(value) ? value : {};
  const update = (
    resourceId: string,
    delta: number,
    min: number,
    max: number,
  ) => {
    const previous = numberOrZero(current[resourceId]);
    const next = Math.max(min, Math.min(max, previous + delta));
    setValue({ ...current, [resourceId]: next } as Params[Key]);
  };
  return (
    <FieldFrame label={labelForInput(input)} errors={errors} missing={missing}>
      <span
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: theme.space[2],
        }}
      >
        {(domain.resources ?? []).map((resource) => {
          const min = resource.min ?? 0;
          const max = resource.max ?? 0;
          const amount = numberOrZero(current[resource.resourceId]);
          return (
            <span
              key={resource.resourceId}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto auto auto",
                alignItems: "center",
                gap: theme.space[1],
                padding: theme.space[2],
                borderRadius: theme.radius.md,
                background: theme.semantic.surface.inset,
              }}
            >
              <span
                style={{
                  minWidth: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: theme.space[1],
                }}
              >
                {resource.icon ? (
                  <span aria-hidden style={{ fontSize: "1.1em" }}>
                    {resource.icon}
                  </span>
                ) : null}
                {resource.label ?? humanize(input.key)}
              </span>
              <StepperButton
                label={`Decrease ${resource.label ?? resource.resourceId}`}
                disabled={disabled || amount <= min}
                browserAttributes={gameplayActuatorAttributes({
                  descriptor,
                  draftValues: handle.values as Readonly<
                    Record<string, unknown>
                  >,
                  inputKey: input.key,
                  intent: "decrement",
                  candidateValue: resource.resourceId,
                  enabled: !(disabled || amount <= min),
                  actuatorKind: "click",
                  actuatorId: `resource-decrement:${input.key}:${resource.resourceId}`,
                  semanticEffects: gameplayResourceMetadata({
                    inputKey: input.key,
                    resourceKey: resource.resourceId,
                    delta: -1,
                  }).semanticEffects,
                })}
                onClick={() => update(resource.resourceId, -1, min, max)}
              >
                -
              </StepperButton>
              <span
                style={{
                  minWidth: "2ch",
                  textAlign: "center",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {amount}
              </span>
              <StepperButton
                label={`Increase ${resource.label ?? resource.resourceId}`}
                disabled={disabled || amount >= max}
                browserAttributes={gameplayActuatorAttributes({
                  descriptor,
                  draftValues: handle.values as Readonly<
                    Record<string, unknown>
                  >,
                  inputKey: input.key,
                  intent: "increment",
                  candidateValue: resource.resourceId,
                  enabled: !(disabled || amount >= max),
                  actuatorKind: "click",
                  actuatorId: `resource-increment:${input.key}:${resource.resourceId}`,
                  semanticEffects: gameplayResourceMetadata({
                    inputKey: input.key,
                    resourceKey: resource.resourceId,
                    delta: 1,
                  }).semanticEffects,
                })}
                onClick={() => update(resource.resourceId, 1, min, max)}
              >
                +
              </StepperButton>
            </span>
          );
        })}
      </span>
    </FieldFrame>
  );
}

function BoundedNumberField<
  Params extends InteractionParamsShape,
  Key extends keyof Params & string,
>({
  descriptor,
  handle,
  input,
  value,
  setValue,
  errors,
  missing,
  disabled,
  domain,
}: InteractionFieldRenderProps<Params, Key> & {
  domain: Extract<InputDomain, { type: "boundedNumber" }>;
}) {
  const theme = useTheme();
  const min = domain.min ?? 0;
  const max = domain.max ?? Number.POSITIVE_INFINITY;
  const step = domain.step ?? 1;
  const current = typeof value === "number" ? value : min;
  const controlId = useId();
  const update = (next: number) =>
    setValue(Math.max(min, Math.min(max, next)) as Params[Key]);
  return (
    <FieldFrame
      label={labelForInput(input)}
      controlId={controlId}
      errors={errors}
      missing={missing}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: theme.space[1],
        }}
      >
        <StepperButton
          label={`Decrease ${input.key}`}
          disabled={disabled || current <= min}
          browserAttributes={gameplayActuatorAttributes({
            descriptor,
            draftValues: handle.values as Readonly<Record<string, unknown>>,
            inputKey: input.key,
            intent: "decrement",
            enabled: !(disabled || current <= min),
            actuatorKind: "click",
            actuatorId: `bounded-decrement:${input.key}`,
            semanticEffects: gameplayScalarStepMetadata({
              inputKey: input.key,
              value: Math.max(min, Math.min(max, current - step)),
            }).semanticEffects,
          })}
          onClick={() => update(current - step)}
        >
          -
        </StepperButton>
        <Input
          id={controlId}
          type="number"
          min={min}
          max={Number.isFinite(max) ? max : undefined}
          step={step}
          value={current}
          disabled={disabled}
          {...gameplayActuatorAttributes({
            descriptor,
            draftValues: handle.values as Readonly<Record<string, unknown>>,
            inputKey: input.key,
            intent: "fill",
            enabled: !disabled,
            actuatorKind: "fill",
            actuatorId: `bounded-fill:${input.key}`,
            acceptedEffectPatterns: gameplayScalarFillMetadata({
              inputKey: input.key,
              domain,
            }).acceptedEffectPatterns,
          })}
          onChange={(event) => update(Number(event.target.value))}
          className="h-9 w-[8ch] px-2 text-center text-sm md:text-sm"
        />
        <StepperButton
          label={`Increase ${input.key}`}
          disabled={disabled || current >= max}
          browserAttributes={gameplayActuatorAttributes({
            descriptor,
            draftValues: handle.values as Readonly<Record<string, unknown>>,
            inputKey: input.key,
            intent: "increment",
            enabled: !(disabled || current >= max),
            actuatorKind: "click",
            actuatorId: `bounded-increment:${input.key}`,
            semanticEffects: gameplayScalarStepMetadata({
              inputKey: input.key,
              value: Math.max(min, Math.min(max, current + step)),
            }).semanticEffects,
          })}
          onClick={() => update(current + step)}
        >
          +
        </StepperButton>
      </span>
    </FieldFrame>
  );
}

function TargetSummaryField<
  Params extends InteractionParamsShape,
  Key extends keyof Params & string,
>({
  input,
  value,
  errors,
  missing,
  domain,
}: InteractionFieldRenderProps<Params, Key> & {
  domain: Extract<InputDomain, { type: "cardTarget" | "boardTarget" }>;
}) {
  const target = inputTargetKind(domain) ?? "target";
  return (
    <FieldFrame label={labelForInput(input)} errors={errors} missing={missing}>
      <span>
        {Array.isArray(value)
          ? value.length > 0
            ? `${value.length} selected: ${value.join(", ")}`
            : `Select ${targetSelectionLabel(domain)}.`
          : typeof value === "string"
            ? value
            : `Select a ${target} on the board.`}
      </span>
    </FieldFrame>
  );
}

function targetSelectionLabel(domain: InputDomain): string {
  const target = inputTargetKind(domain) ?? "target";
  const selection = isTargetDomain(domain) ? domain.selection : undefined;
  if (selection?.mode !== "many") return `a ${target}`;
  const min = selection.min ?? 0;
  if (selection.max !== undefined && min === selection.max) {
    return `${min} ${target}${min === 1 ? "" : "s"}`;
  }
  return `${min}${selection.max ? `-${selection.max}` : "+"} ${target}s`;
}

function StepperButton({
  label,
  disabled,
  browserAttributes,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  browserAttributes?: BrowserInteractionAttributeMap;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <ThemedButton
      type="button"
      variant="secondary"
      size="sm"
      aria-label={label}
      disabled={disabled}
      {...browserAttributes}
      onClick={onClick}
      className="h-8 w-8 text-sm"
    >
      {children}
    </ThemedButton>
  );
}

function labelForInput(input: InteractionInputDescriptor): string {
  if (input.domain.type === "choice") {
    const exact = input.domain.choices?.find(
      (choice) => choice.value === input.defaultValue,
    );
    if (exact?.label && input.key === exact.value) return exact.label;
  }
  return humanize(input.key);
}

function humanize(key: string): string {
  return key
    .replace(/Id$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
