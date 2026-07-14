import type { HTMLAttributes } from "react";
import { interactionUnavailableReason } from "../../utils/interaction-status.js";
import { interactionLabel } from "../../utils/interaction-labels.js";
import {
  renderPrimitive,
  type PrimitiveCommonProps,
} from "../../../ui/primitives/primitive-props.js";
import {
  humanizeInteraction,
  useInteractionPrimitiveContext,
} from "./context.js";

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
