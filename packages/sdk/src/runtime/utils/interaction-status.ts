import type { InteractionHandleStatus } from "../hooks/useInteractionHandle.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";

export type InteractionActionState =
  | "available"
  | "unavailable"
  | "submitting"
  | "submitted";

export type InteractionDisabledReason =
  | "unavailable"
  | "selection-limit"
  | "submitting"
  | "submitted";

export interface InteractionStatusSnapshot {
  status: InteractionHandleStatus;
  actionState: InteractionActionState;
  disabled: boolean;
  disabledReason?: InteractionDisabledReason;
}

export function isInteractionAvailable(
  descriptor: InteractionDescriptor | null | undefined,
): boolean {
  return descriptor?.availability.status === "available";
}

export function interactionUnavailableReason(
  descriptor: InteractionDescriptor | null | undefined,
): string | undefined {
  const availability = descriptor?.availability;
  return availability && availability.status !== "available"
    ? availability.reason
    : undefined;
}

export function interactionStatusSnapshot({
  descriptor,
  status,
}: {
  descriptor: InteractionDescriptor;
  status: InteractionHandleStatus;
}): InteractionStatusSnapshot {
  if (status === "submitted") {
    return {
      status,
      actionState: "submitted",
      disabled: true,
      disabledReason: "submitted",
    };
  }
  if (status === "submitting") {
    return {
      status,
      actionState: "submitting",
      disabled: true,
      disabledReason: "submitting",
    };
  }
  if (!isInteractionAvailable(descriptor)) {
    return {
      status,
      actionState: "unavailable",
      disabled: true,
      disabledReason: "unavailable",
    };
  }
  return {
    status,
    actionState: "available",
    disabled: false,
  };
}
