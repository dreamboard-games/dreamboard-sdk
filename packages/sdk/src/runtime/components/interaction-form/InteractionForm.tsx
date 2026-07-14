/**
 * The interaction form shell: the `InteractionForm` component itself
 * (accordion chrome, header, pending/validation/form-error state, submit
 * handler, and the actions row) plus its `InteractionFormProps`.
 *
 * Moved verbatim from `../InteractionForm.tsx`. Field rendering lives in
 * `./fields.tsx`; the headless input-slot surface lives in `./input-slot.tsx`.
 */
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import {
  surfaceStyle,
  useTheme,
  useChromeSuppression,
  ThemedButton,
} from "../../../ui.js";
import {
  gameplayActuatorAttributes,
  gameplayInteractionRootAttributes,
} from "../../interactions/gameplay-attributes.js";
import type {
  DraftValidation,
  InteractionHandle,
  InteractionParamsShape,
} from "../../hooks/useInteractionHandle.js";
import type { InteractionDescriptor } from "../../types/plugin-state.js";
import { interactionLabel } from "../../utils/interaction-labels.js";
import { resolveInteractionInputs } from "../../utils/interaction-inputs.js";
import { interactionDraftDigestForValues } from "../../utils/interaction-draft-digest.js";
import { isInteractionAvailable } from "../../utils/interaction-status.js";
import {
  gameplayPreparationPatternsForDescriptor,
  gameplaySubmitMetadata,
} from "../../utils/browser-interaction-effects.js";
import {
  InteractionField,
  defaultFormInputs,
  type InteractionFieldRenderMap,
} from "./fields.js";
import {
  createInteractionInputSlot,
  type InteractionInputRenderMap,
  type InteractionSubmitSlot,
} from "./input-slot.js";

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
    draftDigest: interactionDraftDigestForValues(
      descriptor,
      handle.values as Readonly<Record<string, unknown>>,
    ),
    ready: handle.isReady,
    available: !isDisabled,
  });
  const armBrowserAttributes = gameplayActuatorAttributes({
    descriptor,
    draftDigest: interactionDraftDigestForValues(
      descriptor,
      handle.values as Readonly<Record<string, unknown>>,
    ),
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
    draftDigest: interactionDraftDigestForValues(
      descriptor,
      handle.values as Readonly<Record<string, unknown>>,
    ),
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
