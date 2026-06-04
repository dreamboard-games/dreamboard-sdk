/**
 * Controlled visual state contract for `@dreamboard-games/sdk/ui` components.
 *
 * The SDK is Dreamboard-interaction unaware: components consume `display data`
 * and `controlled semantic states`. Runtime adapters compute these states from
 * descriptors/drafts and pass them in as plain props.
 */

/**
 * Generic semantic state attached to a presentational component.
 *
 * Every flag is optional and renders as a stable `data-*` attribute on the
 * underlying element so that selectors, snapshot diffs and accessibility
 * announcements can react to state without inspecting class strings.
 */
export interface InteractionVisualState {
  /** Caller may activate this surface right now. */
  eligible?: boolean;
  /**
   * Eligible *and* a meaningful subset — i.e. at least one peer surface is not
   * eligible. Use this (rather than `eligible`) to drive a "highlight the
   * playable cards" affordance: when every card in a hand is a legal target
   * (e.g. a pass where any card may be chosen, or a turn where you may play
   * anything) the highlight carries no information, so `distinctlyEligible` is
   * `false` for all of them and the ring naturally disappears. `eligible`
   * keeps its literal meaning ("is a legal target") for dimming/logic.
   */
  distinctlyEligible?: boolean;
  /** Currently chosen as part of a draft selection or focus state. */
  selected?: boolean;
  /** Surface is non-interactive and visually muted. */
  disabled?: boolean;
  /** Caller's draft is invalid — render an error tint without removing the surface. */
  invalid?: boolean;
  /** Action has been submitted; render a settled/locked feedback state. */
  submitted?: boolean;
  /** Surface is being previewed (long-press, hover hold) without commitment. */
  previewing?: boolean;
  /**
   * Optional 0..1 progress reading for an in-flight UI intent (swipe, hold,
   * etc.). Components may render this as a fill, scale or halo without owning
   * the gesture pipeline themselves.
   */
  intentProgress?: number;
}

/**
 * Generic UI intent emitted by SDK components.
 *
 * Components do not know what `activate`/`drop` mean in Dreamboard terms —
 * that mapping belongs to a runtime adapter. They only emit when a generic
 * pointer/keyboard gesture completes.
 *
 * - `activate` is a single-target commit produced by a desktop click or a
 *   keyboard activation in `direct-activate` mode.
 * - `drop` is a card→target commit produced by mobile drag or keyboard drop
 *   in `drag-to-target` mode. The opaque `targetId` is registered by a
 *   `CardDropTargetView` and resolved against pointer geometry inside the
 *   `CardDragSurface`.
 * - `previewStart`/`previewEnd` bracket a long-press inspection that does
 *   not commit.
 */
export type CardIntent<
  CardId extends string = string,
  TargetId extends string = string,
> =
  | { type: "activate"; cardId: CardId; source: "tap" | "keyboard" }
  | { type: "previewStart"; cardId: CardId }
  | { type: "previewEnd"; cardId: CardId }
  | {
      type: "drop";
      cardId: CardId;
      targetId: TargetId;
      source: "pointer" | "keyboard";
    };

/**
 * Generic UI intent emitted for a board target (space/edge/vertex).
 */
export type TargetIntent<TargetId extends string = string> =
  | { type: "activate"; targetId: TargetId; source: "tap" | "keyboard" }
  | { type: "previewStart"; targetId: TargetId }
  | { type: "previewEnd"; targetId: TargetId };

/**
 * Controlled visual state for a card drop target rendered through
 * `CardDropTargetView`.
 *
 * `active` is `true` when any card is currently being dragged anywhere on
 * the surface (eligible target should advertise itself). `over` is `true`
 * only for the target that the lifted pointer would currently drop on.
 */
export interface CardDropTargetVisualState extends InteractionVisualState {
  active?: boolean;
  over?: boolean;
}

/**
 * Build the `data-*` attribute bag for an {@link InteractionVisualState} so
 * that components apply a single consistent attribute surface.
 *
 * `undefined` values are emitted (rather than `false`) so that CSS
 * `[data-…="true"]` selectors do not match by mistake.
 */
export function visualStateDataAttributes(
  state: InteractionVisualState | undefined,
): Readonly<Record<string, string | undefined>> {
  if (!state) return {};
  return {
    "data-eligible": state.eligible ? "true" : undefined,
    "data-distinctly-eligible": state.distinctlyEligible ? "true" : undefined,
    "data-selected": state.selected ? "true" : undefined,
    "data-disabled": state.disabled ? "true" : undefined,
    "data-invalid": state.invalid ? "true" : undefined,
    "data-submitted": state.submitted ? "true" : undefined,
    "data-previewing": state.previewing ? "true" : undefined,
    "data-intent-progress":
      typeof state.intentProgress === "number"
        ? String(Math.max(0, Math.min(1, state.intentProgress)))
        : undefined,
  };
}

/**
 * Build the `data-*` attribute bag for a {@link CardDropTargetVisualState}.
 */
export function dropTargetVisualStateDataAttributes(
  state: CardDropTargetVisualState | undefined,
): Readonly<Record<string, string | undefined>> {
  const base = visualStateDataAttributes(state);
  if (!state) return base;
  return {
    ...base,
    "data-drag-active": state.active ? "true" : undefined,
    "data-drag-over": state.over ? "true" : undefined,
  };
}
