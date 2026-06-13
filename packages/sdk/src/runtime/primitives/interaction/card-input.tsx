import { useCallback, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useInteractionUiStore } from "../../context/InteractionDraftContext.js";
import { usePluginState } from "../../context/PluginStateContext.js";
import type { InteractionInputKey } from "../../ui-contract.js";
import type {
  InteractionDescriptor,
  InteractionInputDescriptor,
  ZoneHandlesSnapshot,
} from "../../types/plugin-state.js";
import {
  hasInteractionFieldErrors,
  inputByKey,
  isBoardTargetDomain,
  isResolvedTargetDomain,
  isTargetDomain,
  isManyTargetSelectable,
} from "../../utils/interaction-inputs.js";
import {
  markInteractionPending,
  routeCardInputIntent,
  shouldRouteInteractionPending,
} from "../../utils/interaction-router.js";
import {
  interactionUnavailableReason,
  isInteractionAvailable,
} from "../../utils/interaction-status.js";
import { gameplayCandidateMetadata } from "../../utils/browser-interaction-effects.js";
import {
  composeEventHandlers,
  renderPrimitive,
  type PrimitiveCommonProps,
} from "../../../ui/primitives/primitive-props.js";
import { gameplayActuatorAttributes } from "../../interactions/gameplay-attributes.js";
import {
  useOptionalZonePrimitiveContext,
  useZoneCardContext,
} from "../zone.js";
import { useInteractionPrimitiveContext } from "./context.js";

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
          draftDigest: descriptor.draftDigest,
          inputKey: input,
          intent: selection?.mode === "many" ? "toggle" : "select",
          candidateValue: cardId,
          candidateState: isSelected ? "selected" : "unselected",
          enabled: !isDisabled,
          actuatorKind: "click",
          actuatorId: `primitive-card:${input}:${cardId ?? "missing"}`,
          semanticEffects:
            cardId !== undefined
              ? gameplayCandidateMetadata({
                  descriptor,
                  draftValues: liveDraft,
                  inputKey: input,
                  candidateValue: cardId,
                  intent: selection?.mode === "many" ? "toggle" : "select",
                }).semanticEffects
              : undefined,
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
