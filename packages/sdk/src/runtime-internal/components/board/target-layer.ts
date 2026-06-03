import type { BoardTargetKind } from "../../utils/interaction-inputs.js";

export interface InteractiveTargetState {
  kind?: BoardTargetKind;
  id: string;
  eligible: boolean;
  selectable: boolean;
  hovered: boolean;
  interactionKey?: string;
  interactionId?: string;
  inputKey?: string;
  pending: boolean;
  conflict: boolean;
  conflictInteractionKeys?: readonly string[];
  unavailableReason?: string;
  select?: () => unknown | Promise<unknown>;
}

export interface InteractiveTargetLayer {
  enabled?: boolean;
  eligible?: ReadonlySet<string>;
  selectTargetId?: (targetId: string) => unknown | Promise<unknown>;
  targetState?: (targetId: string) => Partial<InteractiveTargetState>;
}

export interface InteractiveTargetRenderState extends InteractiveTargetState {
  isEnabled: boolean;
  isEligible: boolean;
  isHovered: boolean;
}

export function interactiveTargetRenderState(
  layer: InteractiveTargetLayer,
  targetId: string,
  isHovered: boolean,
): InteractiveTargetRenderState {
  const enabled = layer.enabled !== false;
  const eligible = layer.eligible?.has(targetId) ?? true;
  const extra = layer.targetState?.(targetId) ?? {};
  const selectable =
    extra.selectable ?? (enabled && eligible && !!layer.selectTargetId);
  return {
    id: targetId,
    ...extra,
    eligible: extra.eligible ?? eligible,
    selectable,
    hovered: isHovered,
    pending: extra.pending ?? false,
    conflict: extra.conflict ?? false,
    select:
      extra.select ??
      (layer.selectTargetId
        ? () => layer.selectTargetId?.(targetId)
        : undefined),
    isEnabled: enabled,
    isEligible: extra.eligible ?? eligible,
    isHovered,
  };
}

export function isInteractiveTargetSelectable(
  layer: InteractiveTargetLayer,
  state: InteractiveTargetRenderState,
): boolean {
  return (
    state.isEnabled &&
    state.selectable &&
    !!(state.select ?? layer.selectTargetId)
  );
}
