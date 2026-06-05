import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import {
  useInteractionHandle,
  type InteractionHandle,
  type InteractionParamsShape,
} from "../hooks/useInteractionHandle.js";
import {
  useInteractionUiStore,
  usePendingInteractionKey,
  usePendingInteractionRevision,
} from "../context/InteractionDraftContext.js";
import { usePluginState } from "../context/PluginStateContext.js";
import type { InteractionInputKey, InteractionKey } from "../ui-contract.js";
import type {
  InteractionDescriptor,
  InteractionInputDescriptor,
  ZoneHandlesSnapshot,
} from "../types/plugin-state.js";
import {
  hasInteractionFieldErrors,
  inputByKey,
  isBoardTargetDomain,
  isResolvedTargetDomain,
  isTargetDomain,
  isManyTargetSelectable,
} from "../utils/interaction-inputs.js";
import {
  getInteractionDraftReadiness,
  markInteractionPending,
  routeCardInputIntent,
  shouldRouteInteractionPending,
} from "../utils/interaction-router.js";
import {
  interactionUnavailableReason,
  isInteractionAvailable,
} from "../utils/interaction-status.js";
import { interactionLabel } from "../utils/interaction-labels.js";
import {
  composeEventHandlers,
  renderPrimitive,
  type PrimitiveCommonProps,
} from "./primitive-props.js";
import {
  createGameplayActuatorAttributes,
  createGameplayInteractionRootAttributes,
  type BrowserInteractionAttributeMap,
  type GameplayActuatorAttributesInput,
  type GameplayBrowserInteractionIntent,
} from "../../browser-interaction/index.js";
import {
  BoundInteractionForm,
  castInteractionDraft,
  castInteractionHandle,
  type BoundInteractionFormProps,
} from "./interaction-form-binding.js";
import {
  InteractionField as BaseInteractionField,
  type InteractionFieldProps as BaseInteractionFieldProps,
} from "../components/InteractionForm.js";
import {
  submitInteractionDraft,
  submitInteractionParams,
  type InteractionSubmitCallbacks,
} from "./interaction-submit.js";
import {
  useDialogLifecycle,
  type DialogLifecycleState,
} from "./dialog-lifecycle.js";
import { useGameActionError } from "./game.js";
import { useOptionalZonePrimitiveContext, useZoneCardContext } from "./zone.js";

interface InteractionContextValue {
  interaction: string;
  descriptor: InteractionDescriptor | null;
  handle: ReturnType<typeof useInteractionHandle> | null;
}

const InteractionContext = createContext<InteractionContextValue | null>(null);

function humanizeInteraction(value: string): string {
  const parts = value.split(".");
  const leaf = parts[parts.length - 1] ?? value;
  return leaf
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (first: string) => first.toUpperCase());
}

const GAMEPLAY_BROWSER_SCOPE_ID = "runtime";

function gameplayActuatorAttributes({
  descriptor,
  inputKey,
  intent,
  candidateValue,
  candidateState,
  enabled,
  actuatorKind,
  actuatorId,
}: {
  descriptor: InteractionDescriptor;
  inputKey?: string;
  intent: GameplayBrowserInteractionIntent;
  candidateValue?: unknown;
  candidateState?: "selected" | "unselected" | "mixed";
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
      ? { draftDigest: descriptor.draftDigest }
      : {}),
    ...(inputKey !== undefined ? { inputKey } : {}),
    ...(candidateValue !== undefined ? { candidateValue } : {}),
    ...(candidateState !== undefined ? { candidateState } : {}),
  });
}

export function useInteractionPrimitiveContext(): InteractionContextValue {
  const value = useContext(InteractionContext);
  if (!value) {
    throw new Error(
      "Interaction primitives must be rendered inside <Interaction.Root>.",
    );
  }
  return value;
}

/**
 * Live draft value for the active interaction's card-target input, resolved
 * from the surrounding `<Interaction.Root>`. Returns the selected card-id array
 * for `selection: "many"` inputs and the single id for `selection: "one"`.
 * Returns `undefined` when there is no interaction context or no card-target
 * input (so it is safe to render outside a root). Reactive: `handle.values`
 * updates as the draft changes. Backs the card surface `slot.card.Value`.
 */
export function useResolvedCardTargetValue(): unknown {
  const context = useContext(InteractionContext);
  const descriptor = context?.descriptor;
  const handle = context?.handle;
  if (!descriptor || !handle) return undefined;
  const cardInput = descriptor.inputs.find(
    (input) =>
      isTargetDomain(input.domain) && input.domain.type === "cardTarget",
  );
  if (!cardInput) return undefined;
  return (handle.values as Record<string, unknown>)[cardInput.key];
}

function useInteractionDescriptor(interaction: string) {
  return usePluginState((state) =>
    state.gameplay.availableInteractions.find(
      (descriptor) =>
        descriptor.interactionKey === interaction ||
        descriptor.interactionId === interaction,
    ),
  );
}

export interface InteractionRootProps<
  Interaction extends string = InteractionKey,
> {
  interaction: Interaction;
  children: ReactNode;
  unavailable?: "render" | "hide";
}

function ResolvedInteractionRoot({
  interaction,
  descriptor,
  children,
}: {
  interaction: string;
  descriptor: InteractionDescriptor;
  children: ReactNode;
}) {
  const handle = useInteractionHandle(descriptor);
  const value = useMemo<InteractionContextValue>(
    () => ({ interaction, descriptor, handle }),
    [descriptor, handle, interaction],
  );
  const available = isInteractionAvailable(descriptor);
  const rootAttributes = createGameplayInteractionRootAttributes({
    scopeId: GAMEPLAY_BROWSER_SCOPE_ID,
    interactionKey: descriptor.interactionKey,
    interactionId: descriptor.interactionId,
    ...(descriptor.descriptorDigest !== undefined
      ? { descriptorDigest: descriptor.descriptorDigest }
      : {}),
    ...(descriptor.draftDigest !== undefined
      ? { draftDigest: descriptor.draftDigest }
      : {}),
    readiness: available ? (handle.isReady ? "ready" : "blocked") : "unavailable",
  });
  return (
    <InteractionContext.Provider value={value}>
      {renderPrimitive("span", {
        ...rootAttributes,
        style: { display: "contents" },
        children,
      })}
    </InteractionContext.Provider>
  );
}

export function InteractionRoot<Interaction extends string = InteractionKey>({
  interaction,
  children,
  unavailable = "render",
}: InteractionRootProps<Interaction>) {
  const descriptor = useInteractionDescriptor(interaction);
  if (!descriptor) {
    if (unavailable === "hide") return null;
    return (
      <InteractionContext.Provider
        value={{
          interaction,
          descriptor: null,
          handle: null,
        }}
      >
        {children}
      </InteractionContext.Provider>
    );
  }
  if (!isInteractionAvailable(descriptor) && unavailable === "hide") {
    return null;
  }
  return (
    <ResolvedInteractionRoot interaction={interaction} descriptor={descriptor}>
      {children}
    </ResolvedInteractionRoot>
  );
}

export type InteractionDialogState = DialogLifecycleState;

export interface InteractionDialogRenderState<
  Interaction extends string = InteractionKey,
> {
  interaction: Interaction;
  state: InteractionDialogState;
  open: boolean;
  minimized: boolean;
  dismissed: boolean;
  setOpen: (open: boolean) => void;
  restore: () => void;
  minimize: () => void;
  dismiss: () => void;
}

export interface InteractionDialogProps<
  Interaction extends string = InteractionKey,
> {
  defaultOpen?: boolean;
  onStateChange?: (state: InteractionDialogState) => void;
  children: (state: InteractionDialogRenderState<Interaction>) => ReactNode;
}

export function InteractionDialog<Interaction extends string = InteractionKey>({
  defaultOpen = false,
  onStateChange,
  children,
}: InteractionDialogProps<Interaction>) {
  const { interaction } = useInteractionPrimitiveContext();
  const pendingInteractionKey = usePendingInteractionKey();
  const pendingInteractionRevision = usePendingInteractionRevision();
  const lifecycle = useDialogLifecycle({ defaultOpen, onStateChange });
  const restoredRevisionRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      pendingInteractionKey === interaction &&
      restoredRevisionRef.current !== pendingInteractionRevision
    ) {
      restoredRevisionRef.current = pendingInteractionRevision;
      lifecycle.restore();
    }
  }, [
    interaction,
    lifecycle,
    pendingInteractionKey,
    pendingInteractionRevision,
  ]);
  const renderState = useMemo<InteractionDialogRenderState<Interaction>>(
    () => ({
      interaction: interaction as Interaction,
      ...lifecycle,
    }),
    [interaction, lifecycle],
  );
  return <>{children(renderState)}</>;
}

export interface InteractionSwitchRenderState<
  Interaction extends string = InteractionKey,
> {
  interaction: Interaction;
  descriptor: InteractionDescriptor<Interaction>;
}

export type InteractionSwitchRouteMap<
  Interaction extends string = InteractionKey,
> = {
  [Key in Interaction]?: (
    state: InteractionSwitchRenderState<Key>,
  ) => ReactNode;
};

export interface InteractionRoute {
  readonly collect: Record<string, unknown>;
}

export type InteractionRoutesMap<Interaction extends string = InteractionKey> =
  {
    [Key in Interaction]: InteractionRoute;
  };

export interface InteractionSwitchProps<
  Interaction extends string = InteractionKey,
> {
  interaction?: Interaction;
  routes: InteractionSwitchRouteMap<Interaction>;
  fallback?: ReactNode;
}

export function InteractionSwitch<Interaction extends string = InteractionKey>({
  interaction,
  routes,
  fallback = null,
}: InteractionSwitchProps<Interaction>) {
  const pendingInteractionKey = usePendingInteractionKey();
  const descriptors = usePluginState(
    (state) => state.gameplay.availableInteractions,
  );
  const routedInteraction = interaction ?? pendingInteractionKey;
  const descriptor = routedInteraction
    ? descriptors.find(
        (candidate) => candidate.interactionKey === routedInteraction,
      )
    : undefined;
  if (!descriptor) return <>{fallback}</>;
  const route =
    routes[descriptor.interactionKey as keyof typeof routes] ?? null;
  if (!route) return <>{fallback}</>;
  const typedInteraction = descriptor.interactionKey as Interaction;
  return (
    <InteractionRoot interaction={typedInteraction}>
      {route({
        interaction: typedInteraction,
        descriptor: descriptor as InteractionDescriptor<Interaction>,
      })}
    </InteractionRoot>
  );
}

export interface InteractionRoutesProps<
  Interaction extends string = InteractionKey,
> {
  routes: InteractionRoutesMap<Interaction>;
  fallback?: ReactNode;
  includeUnavailable?: boolean | null;
}

const warnedInteractionRouteIssues = new Set<string>();

function warnInteractionRouteIssue(message: string) {
  if (warnedInteractionRouteIssues.has(message)) return;
  warnedInteractionRouteIssues.add(message);
  console.warn(message);
}

export function InteractionRoutes<Interaction extends string = InteractionKey>({
  routes,
  fallback = null,
  includeUnavailable = false,
}: InteractionRoutesProps<Interaction>) {
  const descriptors = usePluginState(
    (state) => state.gameplay.availableInteractions,
  );
  if (descriptors.length === 0) return <>{fallback}</>;
  const routedDescriptors = descriptors
    .filter(
      (descriptor) => includeUnavailable || isInteractionAvailable(descriptor),
    )
    .map((descriptor) => {
      const interaction = descriptor.interactionKey as Interaction;
      const route = routes[interaction as keyof typeof routes];
      if (!route) {
        warnInteractionRouteIssue(
          `[dreamboard] Interaction.Routes is missing a collector route for "${descriptor.interactionKey}". Declare the interaction in routes so input collection stays explicit.`,
        );
        return null;
      }
      const missingInputs = descriptor.inputs
        .map((input) => input.key)
        .filter((input) => !(input in route.collect));
      if (missingInputs.length > 0) {
        warnInteractionRouteIssue(
          `[dreamboard] Interaction.Routes route "${descriptor.interactionKey}" is missing collectors for: ${missingInputs.join(
            ", ",
          )}.`,
        );
      }
      return descriptor;
    });
  if (routedDescriptors.length === 0) return <>{fallback}</>;
  return null;
}

export type InteractionPartProps = PrimitiveCommonProps &
  HTMLAttributes<HTMLElement>;

export function InteractionLabel({ children, ...props }: InteractionPartProps) {
  const { descriptor, interaction } = useInteractionPrimitiveContext();
  return renderPrimitive("span", {
    ...props,
    "data-dreamboard-interaction-label": "",
    children:
      children ??
      (descriptor
        ? interactionLabel(descriptor)
        : humanizeInteraction(interaction)),
  });
}

export function InteractionDescription({
  children,
  ...props
}: InteractionPartProps) {
  const content = children;
  if (!content) return null;
  return renderPrimitive("span", {
    ...props,
    "data-dreamboard-interaction-description": "",
    children: content,
  });
}

export function InteractionUnavailableMessage({
  children,
  ...props
}: InteractionPartProps) {
  const { descriptor, handle } = useInteractionPrimitiveContext();
  const reason =
    children ??
    handle?.unavailableReason ??
    interactionUnavailableReason(descriptor);
  if (!reason) return null;
  return renderPrimitive("span", {
    ...props,
    "data-dreamboard-interaction-unavailable": "",
    children: reason,
  });
}

export function InteractionValidationMessage({
  children,
  ...props
}: InteractionPartProps) {
  const { handle } = useInteractionPrimitiveContext();
  const validation = handle?.validateDraft();
  const message =
    children ??
    validation?.formErrors[0] ??
    Object.values(validation?.fieldErrors ?? {})[0]?.[0] ??
    (validation?.missing[0]
      ? `${String(validation.missing[0])} is required.`
      : null);
  if (!message) return null;
  return renderPrimitive("span", {
    ...props,
    "data-dreamboard-interaction-validation": "",
    children: message,
  });
}

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
          intent: "arm",
          enabled: !isDisabled,
          actuatorKind: "click",
          actuatorId: "primitive-trigger",
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
          intent:
            descriptor.inputs.length === 0 || hasExplicitParams
              ? "invoke"
              : "submit",
          enabled: !isDisabled,
          actuatorKind: "click",
          actuatorId: "primitive-submit",
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
  return renderPrimitive("input", {
    ...props,
    name,
    ...(descriptor
      ? gameplayActuatorAttributes({
          descriptor,
          inputKey: name,
          intent: "fill",
          candidateValue: value,
          enabled: !isDisabled,
          actuatorKind: "fill",
          actuatorId: `primitive-input:${name}`,
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

export type InteractionCardInputProps<
  Input extends string = InteractionInputKey,
> = PrimitiveCommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    input: Input;
    unsafeCardId?: string;
    selected?: boolean;
    onSelectedChange?: (selected: boolean) => void;
    children?:
      | ReactNode
      | ((state: InteractionCardInputRenderState) => ReactNode);
  };

export interface InteractionCardInputRenderState {
  cardId: string | undefined;
  zone: string | undefined;
  selected: boolean;
  disabled: boolean;
  eligible: boolean;
  targetValid: boolean;
  selectable: boolean;
  cardAvailable: boolean;
  invalid: boolean;
}

export function InteractionCardInput<
  Input extends string = InteractionInputKey,
>({
  input,
  unsafeCardId,
  selected,
  onSelectedChange,
  onClick,
  disabled,
  children,
  ...props
}: InteractionCardInputProps<Input>) {
  const { descriptor, handle } = useInteractionPrimitiveContext();
  const store = useInteractionUiStore();
  const zoneCard = useZoneCardContext();
  const zoneContext = useOptionalZonePrimitiveContext();
  const cardId = zoneCard?.cardId ?? unsafeCardId;
  const validationZone = zoneCard?.zone ?? zoneContext?.zone;
  const zoneSnapshot = usePluginState((state) =>
    validationZone ? state.gameplay.zones[validationZone] : undefined,
  );
  const cardDescriptor = usePluginState((state) => {
    if (!cardId || !validationZone) return undefined;
    return state.gameplay.zones[validationZone]?.playableByCardId[cardId]?.find(
      (candidate) =>
        candidate.interactionKey === descriptor?.interactionKey &&
        candidate.inputs.some((candidateInput) => candidateInput.key === input),
    );
  });
  const inputDescriptor = descriptor
    ? inputByKey(descriptor, input)
    : undefined;
  const targetInvalidReason = cardTargetInvalidReason({
    cardDescriptor,
    cardId,
    inputDescriptor,
    unsafeCardId,
    validationZone,
    zoneCard,
    zoneSnapshot,
  });
  const isTargetValid = targetInvalidReason === undefined;
  throwCardInputDevMismatch({
    cardId,
    targetInvalidReason,
    unsafeCardId,
    validationZone,
    zoneCard,
  });
  const liveDraft = descriptor ? store.getDraft(descriptor.interactionKey) : {};
  const currentValue =
    liveDraft[input] ?? handle?.draft[input] ?? handle?.values[input];
  const selection = isTargetDomain(inputDescriptor?.domain)
    ? inputDescriptor.domain.selection
    : undefined;
  const selectedByDraft =
    selection?.mode === "many"
      ? Array.isArray(currentValue) &&
        currentValue.map((item) => String(item)).includes(String(cardId))
      : currentValue !== undefined &&
        cardId !== undefined &&
        String(currentValue) === String(cardId);
  const isSelected = selected ?? selectedByDraft;
  const descriptorAvailable = isInteractionAvailable(descriptor);
  const cardDescriptorAvailable =
    cardDescriptor === undefined
      ? undefined
      : isInteractionAvailable(cardDescriptor);
  const isCardAvailable =
    cardDescriptorAvailable ?? (isTargetValid && descriptorAvailable);
  const cardUnavailableReason =
    interactionUnavailableReason(cardDescriptor) ??
    (!descriptorAvailable
      ? (interactionUnavailableReason(descriptor) ?? "interaction-unavailable")
      : undefined);
  const isSelectable =
    cardId !== undefined &&
    inputDescriptor !== undefined &&
    isManyTargetSelectable(inputDescriptor, currentValue, cardId);
  const validation = handle?.validateDraft();
  const fieldErrors = validation?.fieldErrors[input] ?? [];
  const isInvalid = fieldErrors.length > 0;
  const isDisabled =
    disabled === true ||
    !descriptorAvailable ||
    !cardId ||
    !isTargetValid ||
    !isCardAvailable ||
    !isSelectable ||
    !handle;

  const activateCardInput = useCallback(() => {
    if (isDisabled || !descriptor || !cardId || !handle || !inputDescriptor) {
      return;
    }
    const { params, readiness } = routeCardInputIntent(store, descriptor, {
      cardInputKey: input,
      cardId,
    });
    const hasMissingSurfaceTarget = readiness.readyFrontier.some((key) => {
      const candidate = inputByKey(descriptor, key);
      return (
        candidate !== undefined &&
        isBoardTargetDomain(candidate.domain) &&
        candidate.domain.selection?.mode !== "many"
      );
    });
    const hasMissingFormInput = readiness.readyFrontier.some((key) => {
      const candidate = inputByKey(descriptor, key);
      return (
        candidate !== undefined &&
        (!isTargetDomain(candidate.domain) ||
          candidate.domain.selection?.mode === "many")
      );
    });
    const hasFieldErrors = hasInteractionFieldErrors(readiness.fieldErrors);
    if (shouldRouteInteractionPending(descriptor, readiness)) {
      markInteractionPending(store, descriptor);
      store.setPendingInteraction(
        !hasMissingSurfaceTarget && (hasMissingFormInput || hasFieldErrors)
          ? descriptor.interactionKey
          : null,
      );
    }
    onSelectedChange?.(
      selection?.mode === "many"
        ? Array.isArray(params[input]) && params[input].includes(cardId)
        : true,
    );
  }, [
    cardId,
    descriptor,
    handle,
    input,
    inputDescriptor,
    isDisabled,
    onSelectedChange,
    selection,
    store,
  ]);

  const renderState: InteractionCardInputRenderState = {
    cardId,
    zone: validationZone,
    selected: isSelected,
    disabled: isDisabled,
    eligible: isTargetValid && isCardAvailable,
    targetValid: isTargetValid,
    selectable: isSelectable,
    cardAvailable: isCardAvailable,
    invalid: isInvalid,
  };
  const renderedChildren =
    typeof children === "function" ? children(renderState) : children;

  return renderPrimitive("button", {
    type: "button",
    ...props,
    children: renderedChildren,
    ...(descriptor
      ? gameplayActuatorAttributes({
          descriptor,
          inputKey: input,
          intent: selection?.mode === "many" ? "toggle" : "select",
          candidateValue: cardId,
          candidateState: isSelected ? "selected" : "unselected",
          enabled: !isDisabled,
          actuatorKind: "click",
          actuatorId: `primitive-card:${input}:${cardId ?? "missing"}`,
        })
      : {}),
    disabled: isDisabled,
    "aria-disabled": isDisabled,
    "aria-pressed": isSelected,
    "data-dreamboard-interaction-card-input": "",
    "data-input-name": input,
    "data-card-id": cardId,
    "data-zone": validationZone,
    "data-selected": isSelected || undefined,
    "data-eligible": isTargetValid && isCardAvailable,
    "data-target-valid": isTargetValid,
    "data-target-invalid-reason": targetInvalidReason,
    "data-selectable": isSelectable,
    "data-card-available": isCardAvailable,
    "data-card-unavailable-reason": cardUnavailableReason,
    "data-invalid": isInvalid || undefined,
    "data-disabled": isDisabled || undefined,
    "data-missing-resource": cardId ? undefined : true,
    onClick: composeEventHandlers(onClick, () => {
      activateCardInput();
    }),
  });
}

type CardTargetInvalidReason =
  | "missing-card"
  | "wrong-zone"
  | "not-in-zone"
  | "not-top-card"
  | "not-in-domain";

function cardTargetInvalidReason({
  cardDescriptor,
  cardId,
  inputDescriptor,
  unsafeCardId,
  validationZone,
  zoneCard,
  zoneSnapshot,
}: {
  cardDescriptor: InteractionDescriptor | undefined;
  cardId: string | undefined;
  inputDescriptor: InteractionInputDescriptor | undefined;
  unsafeCardId: string | undefined;
  validationZone: string | undefined;
  zoneCard: ReturnType<typeof useZoneCardContext>;
  zoneSnapshot: ZoneHandlesSnapshot | undefined;
}): CardTargetInvalidReason | undefined {
  if (!cardId) return "missing-card";
  if (inputDescriptor?.domain.type !== "cardTarget") {
    return "not-in-domain";
  }
  if (zoneCard && unsafeCardId && unsafeCardId !== zoneCard.cardId) {
    return "wrong-zone";
  }
  if (
    validationZone &&
    zoneSnapshot &&
    !zoneSnapshot.cardIds.includes(cardId)
  ) {
    return "not-in-zone";
  }
  if (
    validationZone &&
    inputDescriptor.domain.zoneIds &&
    !inputDescriptor.domain.zoneIds.includes(validationZone)
  ) {
    return "wrong-zone";
  }
  if (validationZone && !cardDescriptor) {
    return zoneSnapshot?.cardIds[0] !== cardId
      ? "not-top-card"
      : "not-in-domain";
  }
  if (
    !zoneCard &&
    isResolvedTargetDomain(inputDescriptor.domain) &&
    !inputDescriptor.domain.eligibleTargets.includes(cardId)
  ) {
    return "not-in-domain";
  }
  return undefined;
}

function throwCardInputDevMismatch({
  cardId,
  targetInvalidReason,
  unsafeCardId,
  validationZone,
  zoneCard,
}: {
  cardId: string | undefined;
  targetInvalidReason: CardTargetInvalidReason | undefined;
  unsafeCardId: string | undefined;
  validationZone: string | undefined;
  zoneCard: ReturnType<typeof useZoneCardContext>;
}) {
  if (!isDevelopmentRuntime() || !validationZone) return;
  if (zoneCard && unsafeCardId && unsafeCardId !== zoneCard.cardId) {
    throw new Error(
      `Interaction.CardInput unsafeCardId '${unsafeCardId}' does not match surrounding Zone.Item card '${zoneCard.cardId}'.`,
    );
  }
  if (targetInvalidReason === "not-in-zone" && cardId) {
    throw new Error(
      `Interaction.CardInput card '${cardId}' is not present in surrounding zone '${validationZone}'.`,
    );
  }
}

function isDevelopmentRuntime(): boolean {
  const processLike = (
    globalThis as {
      process?: { env?: { NODE_ENV?: string } };
    }
  ).process;
  return processLike?.env?.NODE_ENV !== "production";
}

export const Interaction = {
  Root: InteractionRoot,
  State: InteractionState,
  Switch: InteractionSwitch,
  Routes: InteractionRoutes,
  Dialog: InteractionDialog,
  Trigger: InteractionTrigger,
  Label: InteractionLabel,
  Description: InteractionDescription,
  UnavailableMessage: InteractionUnavailableMessage,
  ValidationMessage: InteractionValidationMessage,
  Input: InteractionInput,
  Field: InteractionFieldPrimitive,
  CardInput: InteractionCardInput,
  Form: InteractionFormPrimitive,
  Submit: InteractionSubmit,
};
